---
name: Bug Report
about: Template for bug reporting
title: ''
labels: 'bug'
assignees: ''

---

<!--
IMPORTANT!

If what you're reporting is not a bug or issue with the plugin directly, please create a new discussion: https://github.com/AlexGustafsson/homebridge-wol/discussions.

Example of issues that are not bugs or related to this plugin:

* Wake command, start command or shutdown command do not work - this is user-supplied input and is executed by the plugin just like it would be executed if you were to type it in your own terminal

Example of issues that are helpful to the project:

* Feature suggestions - we love to hear what you envision for this project
* Bug reports - is there a typo or badly handled edge case? We'd love to hear about it!
-->

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
