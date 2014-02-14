// Generated by CoffeeScript 1.7.1
var Chalk, HtmlObj, PATH, Promise, Util, beginningScriptTagReg, corejsReg, endingHeadTagReg, genModuleName, grunt, scriptNodeReg, scriptSrcReg, scriptTagReg, wrapWithComment, _, _getDefineArgs, _getMatchPhrase, _toJsStr,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

grunt = require('grunt');

Util = require('./util');

_ = require('underscore');

PATH = require('path');

Promise = Util.promise;

Chalk = require('chalk');

scriptNodeReg = /<script[^>]*>(?:[\s\S]*?)<\/script\s*>/ig;

scriptSrcReg = /^<script[^>]+src=(?:"|')\s*(\S+)\s*(?:"|')/i;

scriptTagReg = /<(\/)?script(\s+[^>]+)*>/ig;

beginningScriptTagReg = /(^<script(?:\s+[^>]+)*)>/i;

corejsReg = /(\/)?core((?:\.min)?\.js)/i;

endingHeadTagReg = /(<\/\s*head\s*>)/i;

genModuleName = (function(prefix) {
  var i;
  i = 1;
  return function() {
    return prefix + (i++);
  };
})('anonymous_');

wrapWithComment = function(str) {
  if (str) {
    return "\n\t<!--inserted by dolphin-traversal begin-->" + str + "\n\t<!--inserted by dolphin-traversal end-->\n";
  } else {
    return "";
  }
};

_toJsStr = function(jsCode) {
  return jsCode.replace(/\\/g, '\\\\').replace(/"/g, '\\\"').replace(/'/g, '\\\'').replace(/\s*(\n|\r|\r\n)\s*/g, '');
};

_getMatchPhrase = function(input, reg) {
  var result;
  result = input.match(reg);
  return result != null ? result[1] : void 0;
};

_getDefineArgs = function(args) {
  var deps, factory, name;
  factory = function() {};
  deps = [];
  name = genModuleName();
  switch (args.length) {
    case 1:
      factory = args[0];
      break;
    case 2:
      factory = args[1];
      if (typeof args[0] === 'string') {
        name = args[0];
      } else {
        deps = args[0];
      }
      break;
    case 3:
      name = args[0];
      deps = args[1];
      factory = args[2];
  }
  return [name, deps, factory];
};

HtmlObj = (function() {
  function HtmlObj(paths, options) {
    this.paths = paths;
    this.options = options;
    this.define = __bind(this.define, this);
    this._exeDefineSrcipt = __bind(this._exeDefineSrcipt, this);
    this._makeSrcContent = __bind(this._makeSrcContent, this);
    this._makeHtmlSrcLink = __bind(this._makeHtmlSrcLink, this);
    this.init();
  }

  HtmlObj.prototype.init = function() {
    this.depsNameIndex = [];
    this.depsStylesheet = [];
    this.modules = {
      'bjt': {
        url: null
      },
      'Module': {
        url: null
      },
      'globalSetting': {
        url: null
      }
    };
    this.globalPathSetting = {};
    this.fileBasePath = PATH.dirname(this.paths.src);
    this.sharedOutputPaths = this.options.sharedOutputPaths;
    this.content = grunt.file.read(this.paths.src);
    this.initScripts();
    return grunt.log.ok("htmlObj created! (" + (Chalk.gray(this.paths.src)) + ")");
  };

  HtmlObj.prototype.initScripts = function() {
    var insertScript, pos, style_pos;
    pos = 1;
    style_pos = 1;
    this.orgScripts = [];
    insertScript = wrapWithComment('\n<script type="text/javascript" data-how="embedded">define(["globalSetting"], function(GS){GS.setStatus("online");}).executeit();</script>\n');
    return this.content = this.content.replace(scriptNodeReg, (function(_this) {
      return function(scontent) {
        var href, placeholderStr, scriptObj;
        placeholderStr = '<script-placeholder-begin>' + pos + '<script-placeholder-end>';
        href = _getMatchPhrase(scontent, scriptSrcReg);
        scriptObj = {
          htmlStr: corejsReg.test(scontent) ? scontent.replace(corejsReg, function(m, b, a) {
            return (b || '') + 'core-lite' + (a || '');
          }).replace(beginningScriptTagReg, function(m, b) {
            return b + ' data-how="embedded">';
          }) + insertScript : scontent
        };
        scriptObj.pos = pos;
        if (href) {
          scriptObj.url = Util.fs.isUrl(href) ? href : PATH.join(_this.fileBasePath, href);
          scriptObj.src = Util.getContent(scriptObj.url);
        } else {
          scriptObj.src = Promise.resolve(scontent.replace(scriptTagReg, ''));
        }
        _this.orgScripts.push(scriptObj);
        pos += 1;
        if (pos - 1 === 1) {
          return '\n<insert-stylesheets-placeholder>\n' + placeholderStr;
        } else {
          return placeholderStr;
        }
      };
    })(this));
  };

  HtmlObj.prototype.processScripts = function() {
    return this.orgScripts.reduce((function(_this) {
      return function(seq, script) {
        return seq.then(function() {
          return script.src;
        }).then(function(content) {
          script.content = content;
          return script;
        }).then(_this._exeDefineSrcipt);
      };
    })(this), Promise.resolve()).then((function(_this) {
      return function() {
        return _this;
      };
    })(this));
  };

  HtmlObj.prototype.postScriptsProcess = function() {
    var amdScripts, as, indexScripts, _beginIndex, _endIndex, _i, _len;
    amdScripts = this.orgScripts.filter(function(scriptObj) {
      return scriptObj.moduleName != null;
    });
    _beginIndex = 0;
    _endIndex = 0;
    for (_i = 0, _len = amdScripts.length; _i < _len; _i++) {
      as = amdScripts[_i];
      _endIndex = _.indexOf(this.depsNameIndex, as.moduleName);
      as.depsName = this.depsNameIndex.slice(_beginIndex, _endIndex);
      as.postContent = this._pathSettingModuleName === as.moduleName ? (as.htmlStr = as.htmlStr.replace(beginningScriptTagReg, function(m, b) {
        return b + ' data-how="embedded">';
      }), "" + as.htmlStr + "\n" + (wrapWithComment('<shared-scripts-placeholder>')) + "\n") : "" + (wrapWithComment(this._makeSrcContent(as))) + as.htmlStr;
      _beginIndex = _endIndex + 1;
    }
    indexScripts = _.indexBy(this.orgScripts, 'pos');
    this.content = this.content.replace(/<insert-stylesheets-placeholder>/i, (function(_this) {
      return function(placeHolder) {
        return wrapWithComment(_this._makeShareContent('css') + _this.depsStylesheet.join(""));
      };
    })(this));
    this.content = this.content.replace(/<script-placeholder-begin>(\d+)<script-placeholder-end>/ig, (function(_this) {
      return function(placeHolder, pos) {
        if (indexScripts[pos].postContent != null) {
          return indexScripts[pos].postContent.replace(/<shared-scripts-placeholder>/i, function(placeHolder) {
            return _this._makeShareContent('js');
          });
        } else {
          return indexScripts[pos].htmlStr;
        }
      };
    })(this));
    grunt.file.write(this.paths.dest, this.content);
    grunt.log.ok(Chalk.gray(this.paths.dest));
    return this.content;
  };

  HtmlObj.prototype._makeHtmlSrcLink = function(mn) {
    if (!Util.fs.checkFileExt('css', mn)) {
      return "\n<script type=\"text/javascript\" src=\"" + this.modules[mn].url + "\" " + (this.modules[mn].generated === true ? 'dolphin-traversal-generated' : '') + "></script>";
    } else {
      return "\n<link rel=\"stylesheet\"  type=\"text/css\" href=\"" + this.modules[mn].url + "\"/>";
    }
  };

  HtmlObj.prototype._makeSrcContent = function(scriptObj) {
    return scriptObj.depsName.map((function(_this) {
      return function(mn) {
        if (_this.sharedModules && _this.sharedModules[mn]) {
          return '';
        }
        if (!Util.fs.checkFileExt('css', mn)) {
          return _this._makeHtmlSrcLink(mn);
        } else {
          _this.depsStylesheet.push(_this._makeHtmlSrcLink(mn));
          return '';
        }
      };
    })(this)).join('');
  };

  HtmlObj.prototype._makeShareContent = function(type) {
    if (this.sharedModulesIndex && this.sharedModulesIndex[type] && this.sharedModulesIndex[type].length > 0) {
      if (type === 'js') {
        return "\n<script type=\"text/javascript\" src=\"" + (Util.fs.pathToUrl(PATH.relative(this.fileBasePath, this.sharedOutputPaths.js))) + "\" data-how=\"external\"></script>";
      } else {
        return "\n<link rel=\"stylesheet\"  type=\"text/css\" href=\"" + (Util.fs.pathToUrl(PATH.relative(this.fileBasePath, this.sharedOutputPaths.css))) + "\" " + (this.options.cssShare ? 'data-how=\"external\"' : '') + "/>";
      }
    } else {
      return "";
    }
  };

  HtmlObj.prototype._getUrlByModuleName = function(mn) {
    var prefixPath;
    prefixPath = this.globalPathSetting[mn.split('/')[0]];
    if (!/\S+\.\S+$/i.test(mn)) {
      mn += '.js';
    }
    if (prefixPath != null) {
      mn = Util.fs.normalizeBasePath(prefixPath) + mn;
    }
    return mn;
  };

  HtmlObj.prototype._exeDefineSrcipt = function(script) {
    var define;
    define = this.define;
    if (/core_file_load_success/.test(script.content)) {
      return Promise.resolve();
    }
    if (/define\s*\([^\)]+\)/i.test(script.content)) {
      return eval(script.content).then((function(_this) {
        return function(name) {
          return script.moduleName = name;
        };
      })(this));
    } else {
      return Promise.resolve();
    }
  };

  HtmlObj.prototype._registerModule = function(moduleName, deps) {
    this.modules[moduleName] = {
      url: Util.fs.getResourceType(moduleName) === 'text' ? this._getUrlByModuleName(moduleName) + '.js' : this._getUrlByModuleName(moduleName),
      deps: deps
    };
    if (Util.fs.getResourceType(moduleName) === 'text') {
      this.modules[moduleName].generated = true;
    }
    return this.depsNameIndex.push(moduleName);
  };

  HtmlObj.prototype.define = function() {
    var define, deps, factory, name, promise, self, _ref;
    define = this.define;
    _ref = _getDefineArgs(arguments), name = _ref[0], deps = _ref[1], factory = _ref[2];
    deps = deps.map(_.partial(Util.fs.resolveRelativePath, name));
    self = this;
    promise = (Promise.reduce(deps, function(depModuleName) {
      var moduleFilePath;
      if (self.modules[depModuleName]) {
        return Promise.resolve();
      } else if (Util.fs.checkFileExt('css', depModuleName)) {
        self._registerModule(depModuleName, []);
        return Promise.resolve();
      } else {
        moduleFilePath = PATH.join(self.fileBasePath, self._getUrlByModuleName(depModuleName));
        return Util.getContent(moduleFilePath).then(function(content) {
          if (Util.fs.getResourceType(moduleFilePath) === 'text') {
            content = "define('" + depModuleName + "',[],function(){return \"" + (_toJsStr(content)) + "\";});";
            grunt.file.write(moduleFilePath + '.js', content);
          }
          return eval(content);
        });
      }
    })).then(function() {
      self._registerModule(name, deps);
      return name;
    });
    promise.executeit = function() {
      return this.then(function() {
        if (_.isEqual(deps, ['globalSetting']) && /\.setPath/.test(factory.toString())) {
          factory({
            setPath: function(pSetting) {
              return _.extend(self.globalPathSetting, pSetting);
            }
          });
          self._pathSettingModuleName = name;
        }
        return name;
      });
    };
    return promise;
  };

  return HtmlObj;

})();

module.exports = HtmlObj;
