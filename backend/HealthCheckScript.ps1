# HealthCheckScript.ps1
# This script performs health checks and maintenance on a Windows Server
# It returns a JSON object for use in a web application.

param (
    [string]$Action
)

$results = @()

# Function to write to log and console
function Write-Log {
    param($Message, $Type = "info")
    $script:results += [PSCustomObject]@{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        message = $Message
        type = $Type
    }
}

# --- Utility Function to get all System Metrics ---
function Get-SystemMetricsData {
    Write-Log "1. Gathering core system usage data (CPU, Memory, Disk space)..."
    
    $cpu = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq "_Total" }
    $memory = Get-CimInstance -ClassName Win32_OperatingSystem
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"

    $diskSpaceMetrics = [PSCustomObject]@{
        totalGB = [math]::Round($disk.Size / 1GB, 2)
        usedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
        freeGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        usedPercent = [math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 2)
    }

    $metrics = [PSCustomObject]@{
        cpuUsage = [math]::Round($cpu.PercentProcessorTime, 2)
        totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        freeMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        usedMemoryGB = [math]::Round(($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB, 2)
        diskSpace = $diskSpaceMetrics
        pendingUpdates = 0 # Updates check runs later
    }
    return $metrics
}

function Check-Services {
    Write-Log "2. Checking status of critical Windows services (DNS, DHCP, etc.)..."
    $services = @()
    $criticalServices = @("Dnscache", "Dhcpserver")
    foreach ($serviceName in $criticalServices) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        
        $status = "Not Found"
        $restarted = $false
        if ($service) {
            $status = $service.Status.ToString()
            if ($status -ne "Running") {
                Write-Log "Warning: The service '$serviceName' is stopped. Attempting to restart automatically." "warning"
                try {
                    Start-Service -Name $serviceName -ErrorAction Stop
                    $restarted = $true
                    $status = "Running"
                    Write-Log "Success: '$serviceName' was restarted and is now functional." "success"
                } catch {
                    Write-Log ("Error: Failed to restart '" + $serviceName + "'. Check system event logs.") "error"
                }
            } else {
                Write-Log "Info: Service '$serviceName' is running normally." "success"
            }
        } else {
            Write-Log "Warning: Critical service '$serviceName' is not installed or found on the system." "warning"
        }

        $services += [PSCustomObject]@{
            name = $serviceName
            status = $status
            restarted = $restarted
        }
    }
    return $services
}

function Check-DiskSpace {
    Write-Log "3. Analyzing C: drive space..."
    $driveLetter = "C:"
    $thresholdPercent = 80
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
    
    $usedSpacePercent = [math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 2)
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)

    if ($usedSpacePercent -ge $thresholdPercent) {
        Write-Log "Action Required: Disk usage ($usedSpacePercent%) is high. Initiating cleanup of temporary files." "warning"
        Clear-TempFiles
        $diskAfterCleanup = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
        $usedSpacePercentAfter = [math]::Round((1 - ($diskAfterCleanup.FreeSpace / $diskAfterCleanup.Size)) * 100, 2)
        Write-Log "Cleanup complete. Disk usage reduced to $usedSpacePercentAfter%." "success"
    } else {
        Write-Log "Info: C: drive usage ($usedSpacePercent%) is within safe limits. No cleanup performed." "success"
    }

    return [PSCustomObject]@{
        totalGB = [math]::Round($disk.Size / 1GB, 2)
        usedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
        freeGB = $freeSpaceGB
        usedPercent = $usedSpacePercent
    }
}

function Check-WindowsUpdates {
    Write-Log "4. Checking for missing Windows security updates..."
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
        
        $pendingUpdates = $searchResult.Updates | Select-Object Title
        
        if ($pendingUpdates.Count -eq 0) {
            Write-Log "Success: The server has no critical updates pending installation." "success"
        } else {
            Write-Log "Warning: Found $($pendingUpdates.Count) missing security updates. Manual installation is recommended." "warning"
            foreach ($update in $pendingUpdates) {
                Write-Log "Update Found: $($update.Title)" "warning"
            }
        }
        return $pendingUpdates.Count
    } catch {
        Write-Log "Error: Could not communicate with Windows Update service." "error"
        return $null
    }
}

function Clear-TempFiles {
    Write-Log "Starting temporary file cleanup process..."
    
    $tempPaths = @(
        "$env:windir\Temp\*",
        "$env:USERPROFILE\AppData\Local\Temp\*"
    )
    foreach ($path in $tempPaths) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Log "Cleaned temporary files in: $path" "info"
        } catch {
            Write-Log ("Error cleaning files in: " + $path + ". File may be in use.") "error"
        }
    }
    
    try {
        Clear-RecycleBin -DriveLetter "C" -Force -ErrorAction SilentlyContinue | Out-Null
        Write-Log "Recycle Bin emptied successfully." "info"
    } catch {
        Write-Log "Error emptying Recycle Bin. Manual review needed." "error"
    }
}

# --- Main logic ---
switch ($Action) {
    "healthcheck" {
        $metrics = Get-SystemMetricsData
        $services = Check-Services
        $diskSpace = Check-DiskSpace
        $pendingUpdates = Check-WindowsUpdates
        $report = [PSCustomObject]@{
            status = "success"
            message = "Full health check complete."
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            metrics = $metrics
            services = $services
            logs = $results
        }
        $report | ConvertTo-Json
    }
    "cleartemp" {
        Clear-TempFiles
        $report = [PSCustomObject]@{
            status = "success"
            message = "Cleanup task complete."
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            logs = $results
        }
        $report | ConvertTo-Json
    }
    default {
        [PSCustomObject]@{
            status = "error"
            message = "Invalid action specified."
        } | ConvertTo-Json
    }
}
