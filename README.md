# Weather Pill

Current conditions in the [Omarchy](https://omarchy.org) bar: temperature and wind in a pill. Click it for feels-like, wind, humidity, and a three-day forecast.

Derived from Omarchy's built-in weather widget (MIT, copyright David Heinemeier Hansson). Changes are MIT licensed too. See [LICENSE](LICENSE).

## Requirements

- Omarchy with the Quattro shell, so `omarchy plugin` is available.
- `curl`, and Omarchy's weather helpers `omarchy-weather-location`, `omarchy-weather-status` and `omarchy-notification-send`. These ship with Omarchy.
- A Nerd Font for the condition icons.

No sudo or pkexec is required.

## Install

```sh
omarchy plugin add https://github.com/tagrest/omarchy-weather.git --enable
```

Pick a bar section when asked. To place it later:

```sh
omarchy plugin enable io.github.tagrest.weather --section right
```

Plugins run as unsandboxed code inside the Omarchy shell. Read the code before you enable it.

## Use

- Left-click: open the forecast popup.
- Middle-click: refresh now.
- Right-click: send a notification with the current conditions.

## Location

With no location saved, the widget detects your location from your IP address. To set one:

- Click the location name in the popup, type a city, and pick a result.
- Or run `omarchy-weather-location --set "Paris" 48.85,2.35`.

To go back to IP detection, run `omarchy-weather-location --clear`. The location is stored in `~/.local/state/omarchy/settings/weather.json`.

## Settings

Set these once the widget is on the bar:

| Key | Values | Default |
| --- | --- | --- |
| `unit` | `metric` or `imperial` | From your locale and country |
| `refreshMinutes` | Whole minutes, 1 or more | `15` |

For example:

```sh
omarchy bar set io.github.tagrest.weather unit imperial
```

## Network use

- Every refresh: `wttr.in` and `api.open-meteo.com`. `wttr.in` supplies the current conditions, unless you saved a location with coordinates; then Open-Meteo does.
- While you search for a city: `geocoding-api.open-meteo.com`.

Open-Meteo's free API is for non-commercial use. See https://open-meteo.com/en/terms.

## Remove

```sh
omarchy plugin remove io.github.tagrest.weather
```

This takes the widget off the bar and deletes its folder from `~/.config/omarchy/plugins/`. Your saved location is kept.

## Tests

Optional, needs Node.js:

```sh
node --test tests/model.test.js
```

## License

MIT. See [LICENSE](LICENSE).
