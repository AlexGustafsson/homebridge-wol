---
name: Issue template
about: A general template for issue reporting.
title: ''
labels: ''
assignees: ''

---

### Backstory
Please describe how you came across this issue.

### Issue
Please explain the issue in-depth, what you think happened etc.

### Environment
* os & os version:
* node version:
* homebridge version:
* homebridge-wol version:

### Configuration
My configuration looks like this:
```
Please paste your homebridge config.json here

IMPORTANT!
Remove any mac addresses from the configuration by
exchanging them with <mac-address>
```

### Log
When I follow these steps:
1. Make sure `logLevel` is set to `Debug` on all `NetworkDevice` accessories
2. Run `homebridge`
3. Let it run for a couple of minutes
4. Try to turn a device on or off using the plugin
5. Wait one minute
6. Repeat step 4

I get the following log:
```
Please paste your log here
```

### Notes
Please write about things that you did not see fit the above headers.
