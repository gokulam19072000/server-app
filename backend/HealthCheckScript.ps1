# HealthCheckScript.ps1
# This script performs health checks and maintenance on a Windows Server
# It returns a JSON object for use in a web application.

param (
    [string]$Action
)

function Get-ServerMetrics {
    $cpu = Get-WmiObject -Class Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq "_Total" }
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"

    $metrics = [PSCustomObject]@{
        cpuUsage = [math]::Round($cpu.PercentProcessorTime, 2)
        totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        freeMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        usedMemoryGB = [math]::Round(($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB, 2)
        totalDiskGB = [math]::Round($disk.Size / 1GB, 2)
        freeDiskGB = [math]::Round($disk.FreeSpace / 1GB, 2)
        usedDiskGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
        diskUsedPercent = [math]::Round((1 - ($disk.FreeSpace / $disk.Size)) * 100, 2)
    }
    return $metrics
}

function Get-ServiceStatus {
    $criticalServices = @("Dnscache", "Dhcpserver")
    $services = @()
    foreach ($serviceName in $criticalServices) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        $services += [PSCustomObject]@{
            name = $service.DisplayName
            status = if ($service) { $service.Status.ToString() } else { "Not Found" }
        }
    }
    return $services
}

function Perform-HealthCheck {
    $metrics = Get-ServerMetrics
    $services = Get-ServiceStatus
    $report = [PSCustomObject]@{
        status = "success"
        message = "Health check completed."
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        metrics = $metrics
        services = $services
    }
    return $report | ConvertTo-Json
}

function Clear-TempFiles {
    try {
        $tempPaths = @(
            "$env:windir\Temp\*",
            "$env:USERPROFILE\AppData\Local\Temp\*"
        )
        foreach ($path in $tempPaths) {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
        }
        Clear-RecycleBin -DriveLetter "C" -Force -ErrorAction SilentlyContinue
        $result = [PSCustomObject]@{
            status = "success"
            message = "Temporary files and Recycle Bin emptied successfully."
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    } catch {
        $result = [PSCustomObject]@{
            status = "error"
            message = "An error occurred during cleanup: $($_.Exception.Message)"
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    }
    return $result | ConvertTo-Json
}

# Main logic based on the action parameter
switch ($Action) {
    "healthcheck" {
        Perform-HealthCheck
    }
    "cleartemp" {
        Clear-TempFiles
    }
    default {
        [PSCustomObject]@{
            status = "error"
            message = "Invalid action specified."
        } | ConvertTo-Json
    }
}
