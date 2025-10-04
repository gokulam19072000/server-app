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

# --- Health Check Functions ---
function Get-ServerMetrics {
    Write-Log "Gathering system metrics (CPU, Memory, Disk)..."
    
    $cpu = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq "_Total" }
    $memory = Get-CimInstance -ClassName Win32_OperatingSystem
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"

    $metrics = [PSCustomObject]@{
        cpuUsage = [math]::Round($cpu.PercentProcessorTime, 2)
        totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        freeMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        usedMemoryGB = [math]::Round(($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB, 2)
        totalDiskGB = [math]::Round($disk.Size / 1GB, 2)
        usedDiskGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
        freeDiskGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        diskUsedPercent = [math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 2)
    }
    return $metrics
}

function Check-Services {
    Write-Log "Checking critical services..."
    $services = @()
    $criticalServices = @("Dnscache", "Dhcpserver", "wuauserv", "EventLog", "Winmgmt", "TermService")
    foreach ($serviceName in $criticalServices) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        
        $status = "Not Found"
        $restarted = $false
        if ($service) {
            $status = $service.Status.ToString()
            if ($status -ne "Running") {
                Write-Log "Warning: $serviceName is in a '$status' state. Attempting to restart..." "warning"
                try {
                    Start-Service -Name $serviceName -ErrorAction Stop
                    $restarted = $true
                    $status = "Running"
                    Write-Log "$serviceName restarted successfully." "success"
                } catch {
                    Write-Log ("Error restarting " + $serviceName + ": " + $_.Exception.Message) "error"
                }
            } else {
                Write-Log "Service $serviceName is running." "success"
            }
        } else {
            Write-Log "Warning: Service '$serviceName' not found." "warning"
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
    Write-Log "Checking C: drive space..."
    $driveLetter = "C:"
    $thresholdPercent = 80
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
    
    $usedSpacePercent = [math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 2)
    $freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)

    if ($usedSpacePercent -ge $thresholdPercent) {
        Write-Log "C: drive usage ($usedSpacePercent%) exceeds threshold ($thresholdPercent%). Initiating cleanup..." "warning"
        Clear-TempFiles
        $diskAfterCleanup = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
        $usedSpacePercentAfter = [math]::Round((1 - ($diskAfterCleanup.FreeSpace / $diskAfterCleanup.Size)) * 100, 2)
        Write-Log "Cleanup complete. Used space is now $usedSpacePercentAfter%." "info"
    } else {
        Write-Log "C: drive usage ($usedSpacePercent%) is below threshold ($thresholdPercent%). No cleanup needed." "success"
    }

    return [PSCustomObject]@{
        totalGB = [math]::Round($disk.Size / 1GB, 2)
        usedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
        freeGB = $freeSpaceGB
        usedPercent = $usedSpacePercent
    }
}

function Check-WindowsUpdates {
    Write-Log "Checking for pending Windows updates..."
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
        
        $pendingUpdates = $searchResult.Updates | Select-Object Title
        
        if ($pendingUpdates.Count -eq 0) {
            Write-Log "Server is up-to-date with patches." "success"
        } else {
            Write-Log "Warning: Found $($pendingUpdates.Count) missing updates." "warning"
            foreach ($update in $pendingUpdates) {
                Write-Log "Missing update: $($update.Title)" "warning"
            }
        }
        return $pendingUpdates.Count
    } catch {
        Write-Log "Error checking for updates: $($_.Exception.Message)" "error"
        return $null
    }
}

function Clear-TempFiles {
    Write-Log "Starting temporary file cleanup..."
    
    $tempPaths = @(
        "$env:windir\Temp\*",
        "$env:USERPROFILE\AppData\Local\Temp\*"
    )
    foreach ($path in $tempPaths) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Log "Successfully cleaned: $path" "success"
        } catch {
            Write-Log ("Error cleaning " + $path + ": " + $_.Exception.Message) "error"
        }
    }
    
    try {
        Clear-RecycleBin -DriveLetter "C" -Force -ErrorAction SilentlyContinue | Out-Null
        Write-Log "Recycle Bin emptied successfully." "success"
    } catch {
        Write-Log "Error emptying Recycle Bin: $($_.Exception.Message)" "error"
    }
}

# --- Main logic ---
switch ($Action) {
    "healthcheck" {
        $metrics = Get-ServerMetrics
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
