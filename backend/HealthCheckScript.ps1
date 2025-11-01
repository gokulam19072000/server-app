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
    Write-Log "1. Checking current performance (CPU, Memory, Disk space)..." "info"
    
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
    Write-Log "2. Reviewing the status of core Windows services..." "info"
    $services = @()
    $criticalServices = @("Dnscache", "Dhcpserver")
    foreach ($serviceName in $criticalServices) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        
        $status = "Not Found"
        $restarted = $false
        if ($service) {
            $status = $service.Status.ToString()
            if ($status -ne "Running") {
                Write-Log "Problem: The service '$serviceName' is stopped. Attempting automatic fix..." "warning"
                try {
                    Start-Service -Name $serviceName -ErrorAction Stop
                    $restarted = $true
                    $status = "Running"
                    Write-Log "Fixed: '$serviceName' has been successfully restarted." "success"
                } catch {
                    Write-Log ("Error: Failed to restart '" + $serviceName + "'. Requires manual check.") "error"
                }
            } else {
                Write-Log "Status: Service '$serviceName' is running normally." "success"
            }
        } else {
            Write-Log "Warning: Core service '$serviceName' is missing on the server." "warning"
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
    Write-Log "3. Checking if C: drive needs clean-up..." "info"
    $driveLetter = "C:"
    $thresholdPercent = 80
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
    
    $usedSpacePercent = [math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 2)

    if ($usedSpacePercent -ge $thresholdPercent) {
        Write-Log "Action: Disk usage ($usedSpacePercent%) is high. Starting clean-up process." "warning"
        Clear-TempFiles
    } else {
        Write-Log "Info: C: drive usage ($usedSpacePercent%) is healthy. No action needed." "success"
    }

    # CRITICAL: Return structured disk metrics regardless of cleanup
    $diskAfterCheck = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='$driveLetter'"
    return [PSCustomObject]@{
        totalGB = [math]::Round($diskAfterCheck.Size / 1GB, 2)
        usedGB = [math]::Round(($diskAfterCheck.Size - $diskAfterCheck.FreeSpace) / 1GB, 2)
        freeGB = [math]::Round($diskAfterCheck.FreeSpace / 1GB, 2)
        usedPercent = [math]::Round((1 - ($diskAfterCheck.FreeSpace / $diskAfterCheck.Size)) * 100, 2)
    }
}

function Check-WindowsUpdates {
    Write-Log "4. Searching for missing Windows security updates..." "info"
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
        
        $pendingUpdates = $searchResult.Updates | Select-Object Title
        
        if ($pendingUpdates.Count -eq 0) {
            Write-Log "Status: The server is up-to-date. No critical updates pending." "success"
        } else {
            Write-Log "Alert: Found $($pendingUpdates.Count) critical updates pending installation." "warning"
        }
        return $pendingUpdates.Count
    } catch {
        Write-Log "Error: Could not communicate with Windows Update service." "error"
        return 0
    }
}

function Install-Updates {
    Write-Log "Starting Windows Update installation..." "info"
    try {
        Import-Module PSWindowsUpdate -ErrorAction Stop
        
        $updatesToInstall = Get-WindowsUpdate -AcceptAll -Install
        
        if ($updatesToInstall.Count -eq 0) {
            Write-Log "Status: No updates were found to install." "success"
            return 0
        }
        
        Write-Log "Installation: Installing $($updatesToInstall.Count) updates. This may take several minutes..." "warning"
        
        Write-Log "Success: All available updates have been installed." "success"
        
        # Check reboot status
        $rebootStatus = Get-WURebootStatus
        if ($rebootStatus.RebootRequired) {
            Write-Log "IMPORTANT: A server restart is required to finish installing updates." "warning"
        }
        
        return $updatesToInstall.Count
        
    } catch {
        Write-Log "Error: Update installation failed. The 'PSWindowsUpdate' module may not be installed." "error"
        return 0
    }
}

function Clear-TempFiles {
    Write-Log "Starting temporary file cleanup process..." "info"
    $tempPaths = @(
        "$env:windir\Temp\*",
        "$env:USERPROFILE\AppData\Local\Temp\*"
    )
    foreach ($path in $tempPaths) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
            Write-Log "Cleaned: $path" "info"
        } catch {
            Write-Log ("Error cleaning: " + $path + ". File may be in use.") "error"
        }
    }
    
    try {
        Clear-RecycleBin -DriveLetter "C" -Force -ErrorAction SilentlyContinue | Out-Null
        Write-Log "Recycle Bin emptied successfully." "success"
    } catch {
        Write-Log "Error emptying Recycle Bin. Manual review needed." "error"
    }
}

# --- Main logic ---
switch ($Action) {
    "healthcheck" {
        $metrics = Get-SystemMetricsData
        $services = Check-Services
        $diskSpaceMetrics = Check-DiskSpace # Get the disk metrics from the check function
        $pendingUpdatesCount = Check-WindowsUpdates # Get the update count

        # CRITICAL FIX: Merge metrics data correctly
        $metrics.diskSpace = $diskSpaceMetrics
        $metrics.pendingUpdates = $pendingUpdatesCount

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
    "installupdates" {
        $installedCount = Install-Updates
        
        # Refresh metrics after install attempt
        $metrics = Get-SystemMetricsData
        $pendingUpdatesCount = Check-WindowsUpdates # Re-check updates after install attempt
        $metrics.pendingUpdates = $pendingUpdatesCount
        
        $report = [PSCustomObject]@{
            status = "success"
            message = "Update process finished."
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            metrics = $metrics
            services = @() # Only logs and metrics are needed here
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

