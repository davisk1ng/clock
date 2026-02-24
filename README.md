# clock

This clock now supports running without relying on the device's internal clock.

## Time source behavior

- On load, it tries to sync with an online time API.
- After syncing, it advances using elapsed runtime (`performance.now`) rather than re-reading the local system clock every second.
- It automatically re-syncs with network time every 10 minutes.
- If network time is unavailable, it falls back to the device clock.