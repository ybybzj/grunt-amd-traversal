# grunt-dolphin-traversal

> Preprocessor that deal with htmls which use AMD module system, and inject all the dependencies' link into the right places. Produce input htmls for grunt plugin "dolphin-optimizer."

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-dolphin-traversal --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-dolphin-traversal');
```

## The "dolphin-traversal" task

### Overview
In your project's Gruntfile, add a section named `dolphin-traversal` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  dolphin-traversal: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.srcDir
Type: `String`
Default value: `src`

A string value that indicates the src directory.

#### options.sharedFilesPercent
Type: `Decimal`
Default value: `1.1`

A decimal num that indicates the proportion of html files share the same src file(js/css).

#### options.sharedFilesName
Type: `String`
Default value: `shares`

A string value that is used to name shared js/css output file.

#### options.sharedPaths
Type: `String`
Default value: `'share'`

A string value that is used to designate directory of shared output files, relative to <srcDir>.

#### options.cssShare
Type: `Boolean`
Default value: `false`

Whether or not take stylesheets into account when calculate sharing.

#### options.embeddedFiles
Type: `Array`
Default value: `[]`

A array of file pattern that indicates which files should be exclude when calculating sharing, relative to <srcDir>.

### Usage Examples

  
```js
grunt.initConfig({
  dolphin-traversal: {
    options: {
      srcDir:'project/src',
      sharedFilesPercent:0.8,
      sharedFilesName:'shares',
      sharedPaths:'share',
      cssShare: true,
      embeddedFiles: ['index.html']
    }
  },
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
