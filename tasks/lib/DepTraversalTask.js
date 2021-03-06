// Generated by CoffeeScript 1.7.1
var Chalk, DepTraversalTask, HtmlObj, OUTPUT_EXT, PATH, Promise, Util, grunt, _, _predefinedModules, _resolveSharedFileOrder,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('underscore');

grunt = require('grunt');

Util = require('./util');

Promise = Util.promise;

HtmlObj = require('./HtmlObj');

PATH = require('path');

Chalk = require('chalk');

OUTPUT_EXT = 'tvs';

_predefinedModules = ['globalSetting', 'bjt', 'Module'];

_resolveSharedFileOrder = function(_shareDepsMap) {
  var result, _inQueue, _resolveOneModule, _tempBag;
  result = {
    js: [],
    css: []
  };
  _tempBag = {};
  _inQueue = function(mn) {
    if (Util.fs.checkFileExt('css', mn)) {
      result.css.push(mn);
    } else {
      result.js.push(mn);
    }
    _tempBag[mn] = 1;
  };
  _resolveOneModule = function(mn) {
    var deps;
    if (_tempBag[mn]) {
      return;
    }
    deps = _(_shareDepsMap[mn].deps).difference(_predefinedModules);
    if (deps.length === 0) {
      _inQueue(mn);
    } else {
      deps.forEach(function(dmn) {
        return _resolveOneModule(dmn);
      });
      _inQueue(mn);
    }
  };
  _.keys(_shareDepsMap).forEach(function(mn) {
    return _resolveOneModule(mn);
  });
  return result;
};

DepTraversalTask = (function() {
  function DepTraversalTask(task) {
    this._makeSharedFiles = __bind(this._makeSharedFiles, this);
    var self;
    self = this;
    this.done = task.async();
    this.origTask = task;
    this.options = task.options(DepTraversalTask.Defaults);
    this.options.embeddedFiles = grunt.file.expand({
      cwd: this.options.srcDir,
      filter: 'isFile'
    }, this.options.embeddedFiles).map((function(_this) {
      return function(efname) {
        return Util.fs.unixifyPath(PATH.join(_this.options.srcDir, efname));
      };
    })(this));
    if (Object.prototype.toString.call(this.options.sharedPaths) === '[object String]') {
      this.options.sharedPaths = {
        js: self.options.sharedPaths,
        css: self.options.sharedPaths
      };
    }
    this.sharedOutputPaths = this.options.sharedOutputPaths = {
      js: PATH.join(this.options.srcDir, this.options.sharedPaths.js, this.options.sharedFilesName + '.js'),
      css: PATH.join(this.options.srcDir, this.options.sharedPaths.css, this.options.sharedFilesName + '.css')
    };
    this.init();
  }

  DepTraversalTask.prototype.init = function() {
    var dest, fileObj, src, srcFiles;
    grunt.log.writeln(Chalk.blue.bgWhite("Task preperation start..."));
    srcFiles = grunt.file.expandMapping(["**/*.html", '!**/*.tpl.html'], this.options.srcDir, {
      cwd: this.options.srcDir,
      expand: true,
      filter: 'isFile',
      ext: '.tvs'
    });
    return this.htmlObjs = _.flatten((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = srcFiles.length; _i < _len; _i++) {
        fileObj = srcFiles[_i];
        dest = fileObj.dest;
        src = fileObj.src.filter(function(s) {
          if (!grunt.file.exists(s)) {
            grunt.log.error("Source file " + s + " not found.");
            return false;
          }
          return true;
        });
        _results.push(src.map(function(s) {
          return {
            src: s,
            dest: dest
          };
        }));
      }
      return _results;
    })()).map((function(_this) {
      return function(fm) {
        var htmlObj;
        htmlObj = new HtmlObj(fm, _this.options);
        return htmlObj;
      };
    })(this));
  };

  DepTraversalTask.prototype._makeSharedFiles = function(type, _sharedModules, _shareDeps) {
    var _sharedContent;
    _sharedContent = [];
    return (Promise.reduce(_sharedModules[type].map((function(_this) {
      return function(mn) {
        return Util.getContent(_shareDeps[mn].absPath);
      };
    })(this)), function(content) {
      return _sharedContent.push(content);
    })).then((function(_this) {
      return function() {
        if (_sharedContent.length > 0) {
          grunt.file.write(_this.sharedOutputPaths[type], _sharedContent.join('\n'));
          return grunt.log.ok(Chalk.gray(_this.sharedOutputPaths[type]));
        }
      };
    })(this));
  };

  DepTraversalTask.prototype._isShare = function(srcPath) {
    return grunt.file.isMatch({
      filter: 'isFile'
    }, this.options.embeddedFiles, srcPath);
  };

  DepTraversalTask.prototype.run = function() {
    var _referredMap, _referredNum, _shareDeps, _sharedContent;
    _referredMap = {};
    _referredNum = 0;
    _shareDeps = {};
    _sharedContent = {
      js: [],
      css: []
    };
    grunt.log.writeln("");
    grunt.log.writeln(Chalk.blue.bgWhite("Start resolving dependencies and generating shared files..."));
    (Promise.reduce(this.htmlObjs.map(function(htmlObj) {
      return htmlObj.processScripts();
    }), (function(_this) {
      return function(htmlObj) {
        var mn, _i, _len, _ref;
        if (_this._isShare(htmlObj.paths.src)) {
          return;
        }
        _ref = htmlObj.depsNameIndex;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          mn = _ref[_i];
          if (htmlObj._pathSettingModuleName === mn) {
            continue;
          }
          _referredMap[mn] = _referredMap[mn] != null ? _referredMap[mn] + 1 : 1;
        }
        return _referredNum++;
      };
    })(this))).then((function(_this) {
      return function() {
        var _shareHtmlObjs, _sharedModules;
        _(_referredMap).each(function(v, k) {
          var enoughToShare;
          enoughToShare = v / _referredNum >= _this.options.sharedFilesPercent;
          return _referredMap[k] = Util.fs.checkFileExt('css', k) ? _this.options.cssShare && enoughToShare : enoughToShare;
        });
        _shareHtmlObjs = _(_this.htmlObjs).filter(function(obj) {
          return !_this._isShare(obj.paths.src);
        });
        _(_shareHtmlObjs).each(function(htmlObj) {
          var modules;
          modules = htmlObj.modules;
          return _(modules).each(function(v, mn) {
            modules[mn].share = _referredMap[mn];
            if (modules[mn].share === true) {
              return _shareDeps[mn] = {
                deps: _this.options.cssShare === true ? modules[mn].deps : _(modules[mn].deps).filter(function(d) {
                  return !Util.fs.checkFileExt('css', d);
                }),
                absPath: PATH.resolve(htmlObj.fileBasePath, modules[mn].url)
              };
            }
          });
        });
        _sharedModules = _resolveSharedFileOrder(_shareDeps);
        _(_shareHtmlObjs).each(function(htmlObj) {
          htmlObj.sharedModulesIndex = _sharedModules;
          return htmlObj.sharedModules = _shareDeps;
        });
        return Promise.all(['js', 'css'].map(function(type) {
          return _this._makeSharedFiles(type, _sharedModules, _shareDeps);
        }));
      };
    })(this)).then((function(_this) {
      return function() {
        grunt.log.ok(Chalk.cyan("Dependencies resolved and shared files are generated!"));
        grunt.log.writeln("");
        grunt.log.writeln(Chalk.blue.bgWhite("Start generating traversal files ..."));
        return _this.htmlObjs.map(function(htmlObj) {
          return htmlObj.postScriptsProcess();
        });
      };
    })(this)).then((function(_this) {
      return function() {
        grunt.log.ok(Chalk.cyan("Traversal files are generated successfully!"));
        return _this.done();
      };
    })(this))["catch"](grunt.log.error);
  };

  DepTraversalTask.Defaults = {
    srcDir: 'src',
    sharedFilesPercent: 1.1,
    sharedFilesName: 'shares',
    sharedPaths: 'share',
    cssShare: false,
    embeddedFiles: []
  };

  DepTraversalTask.taskName = 'dolphin-traversal';

  DepTraversalTask.taskDescription = 'Preprocessor that deal with htmls which use AMD module system, and inject all the dependencies\' link into the right places. Produce input htmls for grunt plugin "dolphin-optimizer."';

  DepTraversalTask.registerWithGrunt = function(grunt) {
    grunt.registerMultiTask(DepTraversalTask.taskName, DepTraversalTask.taskDescription, function() {
      var task;
      task = new DepTraversalTask(this);
      task.run();
    });
  };

  return DepTraversalTask;

})();

module.exports = DepTraversalTask;
