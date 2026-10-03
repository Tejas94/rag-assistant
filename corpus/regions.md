# Regions and data residency

## Available regions

Northwind Cloud runs in four regions: **lon-1** (London), **man-1** (Manchester), **ams-1** (Amsterdam) and **fra-1** (Frankfurt). New projects default to lon-1.

## Data residency

Data never leaves the region you choose, including backups. Customers who need UK-only residency should use lon-1 or man-1 and enable the "UK residency lock" setting, which blocks cross-region replication.

## Moving between regions

A project can be moved to another region with the `nw migrate --region` command. Migration takes the project offline for roughly five minutes per 10 GB of data. Moves between UK and EU regions require the Team plan or higher.

## Latency

Typical round-trip latency between lon-1 and ams-1 is 8 ms. Between lon-1 and fra-1 it is 14 ms.
