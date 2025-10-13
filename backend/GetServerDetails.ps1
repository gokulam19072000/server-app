# GetServerDetails.ps1
# This script fetches basic server metrics for display on a webpage.
# It does not perform any health checks or maintenance.

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

# --- Get Metrics Function ---
function Get-ServerMetrics {
    Write-Log "Fetching core server metrics..."
    
    $cpu = Get-CimInstance -ClassName Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq "_Total" }
    $memory = Get-CimInstance -ClassName Win32_OperatingSystem
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"

    # CRITICAL FIX: Explicitly create diskSpace object for React structure
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
        diskSpace = $diskSpaceMetrics # Correctly nested property
        pendingUpdates = "N/A" # Default to N/A for initial load
    }
    return $metrics
}

# --- Get Service Status (Passive Check) ---
function Get-ServiceStatus {
    Write-Log "Fetching critical service status..."
    $services = @()
    $criticalServices = @("Dnscache", "Dhcpserver")
    foreach ($serviceName in $criticalServices) {
        $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        $services += [PSCustomObject]@{
            name = $serviceName
            status = if ($service) { $service.Status.ToString() } else { "Not Found" }
        }
    }
    return $services
}

$metrics = Get-ServerMetrics
$services = Get-ServiceStatus

$report = [PSCustomObject]@{
    status = "success"
    message = "Server details loaded."
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    metrics = $metrics
    services = $services
    logs = $results
}
$report | ConvertTo-Json
