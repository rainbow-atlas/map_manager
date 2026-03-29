# Queer Map Iframe Embedding Guide

This guide explains how to embed the Queer Map as an iframe in your website and customize it using URL parameters.

## Basic Embedding

To embed the map in your website, use the following HTML code:

```html
<iframe 
  src="https://your-domain.com/queer_map/" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="geolocation"
  title="Queer Map"
></iframe>
```

You can adjust the `width` and `height` parameters to fit your website design.

## URL Parameters

The Queer Map supports several URL parameters that allow you to customize the view:

### Category Filter

To show only locations from a specific category:

```
?category=Category+Name
```

Example:
```
?category=Religious+Site
```

### Tag Filters

To filter locations by specific tags:

```
?tags=tag1,tag2,tag3
```

Example:
```
?tags=lgbt-friendly,accessible
```

### Fullscreen Mode

To display the map in fullscreen mode (without the sidebar):

```
?fullscreen=true
```

To explicitly show the sidebar, you can use:

```
?fullscreen=false
```

### Hide Legal Links

To hide the legal information links:

```
?hideLegal=true
```

### Focus a specific location

To open the map centered on one place and open its detail card, use the numeric **location id** (the same `id` field as in `locations.json` / your database):

```
?location=3
```

**Do not combine** `location` with `category` or `tags` in the same URL for embedding: use either filter mode (`category` and/or `tags`) or a single `location`, not both. Other options such as `fullscreen`, `hideLegal`, and `debug` can be combined with either mode.

### Location detail: map preview vs full modal

When using `location`, you can control whether the large detail modal opens or only the map pin preview card:

```
?location=3&locationDetail=preview
```

- **`locationDetail=preview`**: center the map on the pin and show the **small preview card** on the map only (no full-screen modal).
- **Default** (omit `locationDetail`): open the **full detail modal** after load.

### Combining Parameters

You can combine multiple parameters using the `&` character:

```
?category=Cafes&tags=vegan,accessible&fullscreen=true
```

Example with a focused location and fullscreen (no category/tags):

```
?location=3&fullscreen=true
```

## Troubleshooting

### Sidebar Not Showing

If you're embedding the map in an iframe and the sidebar doesn't appear:

1. Make sure you're not including `fullscreen=true` in your URL parameters
2. Explicitly set `fullscreen=false` in your URL:
   ```
   ?fullscreen=false
   ```
3. Check that your iframe is wide enough to accommodate the sidebar (at least 500px wide)
4. Try adding the following attributes to your iframe to ensure proper loading:
   ```html
   scrolling="yes"
   sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
   ```

A complete example for troubleshooting sidebar issues:

```html
<iframe 
  src="https://your-domain.com/queer_map/?fullscreen=false" 
  width="800px" 
  height="600px" 
  frameborder="0"
  allow="geolocation"
  scrolling="yes"
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
  title="Queer Map"
></iframe>
```

#### Debug Information

To see debug information while troubleshooting, add the `debug=true` parameter:

```
?debug=true
```

This will display information about the iframe status and fullscreen mode in the header.

Example with debugging enabled:
```
https://your-domain.com/queer_map/?fullscreen=false&debug=true
```

## Examples

Here are some examples of complete iframe code with different parameter combinations:

### Example 1: Show only Religious Sites in fullscreen mode

```html
<iframe 
  src="https://your-domain.com/queer_map/?category=Religious+Site&fullscreen=true" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="geolocation"
  title="Queer Religious Sites"
></iframe>
```

### Example 2: Show LGBT-friendly and accessible locations

```html
<iframe 
  src="https://your-domain.com/queer_map/?tags=lgbt-friendly,accessible&fullscreen=false" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="geolocation"
  title="LGBT-friendly and Accessible Locations"
></iframe>
```

### Example 3: Full embedding with all options

```html
<iframe 
  src="https://your-domain.com/queer_map/?category=Cafes&tags=vegan,accessible&fullscreen=true&hideLegal=true" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="geolocation"
  title="Vegan and Accessible Cafes"
></iframe>
```

## Responsive Embedding

For responsive embedding that maintains a specific aspect ratio, you can use the following CSS approach:

```html
<div style="position: relative; padding-bottom: 75%; height: 0; overflow: hidden;">
  <iframe 
    src="https://your-domain.com/queer_map/" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
    frameborder="0"
    allow="geolocation"
    title="Queer Map"
  ></iframe>
</div>
```

This will create an iframe that maintains a 4:3 aspect ratio (75%). You can adjust the `padding-bottom` percentage to change the aspect ratio:
- 56.25% for 16:9
- 75% for 4:3
- 100% for 1:1 (square)

## Browser Compatibility

The embedded map should work in all modern browsers. For older browsers, you might want to include a fallback message:

```html
<iframe 
  src="https://your-domain.com/queer_map/" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="geolocation"
  title="Queer Map"
>
  Your browser does not support iframes. Please visit <a href="https://your-domain.com/queer_map/">Queer Map</a> directly.
</iframe>
```

## Security Considerations

If you're embedding the map on a secure (HTTPS) site, make sure to use HTTPS for the iframe source as well to avoid mixed content warnings. 