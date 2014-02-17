_ = require 'underscore'
grunt = require 'grunt'
Util = require './util'
Promise = Util.promise
HtmlObj = require './HtmlObj'
PATH = require 'path'
Chalk = require 'chalk'
OUTPUT_EXT = 'tvs'


#hepler
_predefinedModules = ['globalSetting','bjt','Module']
_resolveSharedFileOrder = (_shareDepsMap)->
  result = 
    js:[]
    css:[]
  _tempBag = {}

  _inQueue = (mn)->
    if Util.fs.checkFileExt 'css',mn
      result.css.push mn
    else
      result.js.push mn
    _tempBag[mn] = 1
    return
  _resolveOneModule = (mn)->
    return if _tempBag[mn]
    deps = _(_shareDepsMap[mn].deps).difference _predefinedModules
    if deps.length is 0
      _inQueue mn
    else
      deps.forEach (dmn)->
        _resolveOneModule dmn
      _inQueue mn
    return
  _.keys(_shareDepsMap).forEach (mn)->_resolveOneModule mn
  result



class DepTraversalTask
  constructor: (task)->
    self = @
    @done = task.async()
    @origTask = task
    @options = task.options DepTraversalTask.Defaults
    
    @options.embeddedFiles = 
      grunt.file.expand {cwd:@options.srcDir,filter:'isFile'},@options.embeddedFiles
      .map (efname)=>Util.fs.unixifyPath PATH.join @options.srcDir, efname
    # @options.embeddedFiles = @options.embeddedFiles.map (efname)=> PATH.join @options.srcDir,efname
    if Object::toString.call(@options.sharedPaths) is '[object String]'
      @options.sharedPaths = {js:self.options.sharedPaths, css:self.options.sharedPaths}
      
    @sharedOutputPaths = @options.sharedOutputPaths = 
      js: PATH.join @options.srcDir, @options.sharedPaths.js, @options.sharedFilesName+'.js'
      css: PATH.join @options.srcDir, @options.sharedPaths.css, @options.sharedFilesName+'.css'
    # console.log @options
    @init()

  init: ->
    grunt.log.writeln Chalk.blue.bgWhite "Task preperation start..."
    srcFiles = grunt.file.expandMapping ["**/*.html",'!**/*.tpl.html'], @options.srcDir, {cwd:@options.srcDir,expand:true,filter:'isFile',ext:'.tvs'}
    # console.log srcFiles
    @htmlObjs =_.flatten(for fileObj in srcFiles
      # console.log fileObj.cssPath
      dest = fileObj.dest
      src = fileObj.src.filter (s)->
        if not grunt.file.exists(s)
          grunt.log.error("Source file #{s} not found.")
          return false
        true
      src.map (s)->
        src:s 
        dest: dest
    ).map((fm)=>
      # grunt.log.writeln("src: #{fm.src}")
      # grunt.log.writeln("dest: #{fm.dest}")
      htmlObj = new HtmlObj(fm,@options)
      # console.log htmlObj.content
      htmlObj
    )
  _makeSharedFiles: (type,_sharedModules,_shareDeps)=>
    _sharedContent = []
    (Promise.reduce _sharedModules[type].map((mn)=>Util.getContent(_shareDeps[mn].absPath)), (content)->
        _sharedContent.push content
      ).then(=>
        if _sharedContent.length > 0
          grunt.file.write @sharedOutputPaths[type],_sharedContent.join('\n')
          grunt.log.ok Chalk.gray @sharedOutputPaths[type]
      )
  #Decide whether file at "srcPath" should be taken into account when calculate sharing
  _isShare: (srcPath)->
    grunt.file.isMatch {filter:'isFile'}, @options.embeddedFiles, srcPath
  run: ->
    _referredMap = {}
    _referredNum = 0
    _shareDeps = {}
    _sharedContent = 
      js:[]
      css:[]
    grunt.log.writeln ""
    grunt.log.writeln Chalk.blue.bgWhite "Start resolving dependencies and generating shared files..."
    (Promise.reduce (@htmlObjs.map (htmlObj)->htmlObj.processScripts()),(htmlObj)=>
          #exclude embeddedFiles
          return if @_isShare htmlObj.paths.src
          for mn in htmlObj.depsNameIndex
            continue if htmlObj._pathSettingModuleName is mn #don't share pathSetting script file
            _referredMap[mn] = if _referredMap[mn]? then _referredMap[mn]+1 else 1
          _referredNum++
    ).then(=>
      _(_referredMap).each((v,k) =>
        enoughToShare = (v/_referredNum >= @options.sharedFilesPercent)
        _referredMap[k]= if Util.fs.checkFileExt 'css',k then @options.cssShare and  enoughToShare else enoughToShare
      )
      _shareHtmlObjs = _(@htmlObjs).filter((obj)=>not @_isShare obj.paths.src)
      _(_shareHtmlObjs).each((htmlObj)=>
        modules = htmlObj.modules
        _(modules).each (v,mn)=>
          modules[mn].share = _referredMap[mn]
          if modules[mn].share is true
            _shareDeps[mn] = 
              deps:
                if @options.cssShare is true 
                  modules[mn].deps
                else
                  _(modules[mn].deps).filter((d)->not Util.fs.checkFileExt 'css',d)
              absPath: PATH.resolve(htmlObj.fileBasePath,modules[mn].url)
      )
      _sharedModules = _resolveSharedFileOrder(_shareDeps)
      # console.log _sharedModules
      _(_shareHtmlObjs).each (htmlObj)->
        htmlObj.sharedModulesIndex = _sharedModules
        htmlObj.sharedModules = _shareDeps
      Promise.all(['js','css'].map((type)=>@_makeSharedFiles(type,_sharedModules,_shareDeps)))
    )
    .then(=>
      grunt.log.ok Chalk.cyan "Dependencies resolved and shared files are generated!"
      grunt.log.writeln ""
      grunt.log.writeln Chalk.blue.bgWhite "Start generating traversal files ..."
      @htmlObjs.map (htmlObj)->htmlObj.postScriptsProcess()
    )
    # .then((contents)->contents.forEach (content)->console.log(content))
    .then(=>grunt.log.ok Chalk.cyan "Traversal files are generated successfully!";@done())
    .catch(grunt.log.error)
    # @done()
    return


  #static properties#
  @Defaults :
    srcDir:'src' #src files' directory
    sharedFilesPercent:1.1 # > 1.0 stands for don't care sharing
    sharedFilesName:'shares' #js -> 'shares.js'; css -> 'shares.css'
    sharedPaths:'share' #relative to <srcDir>
    cssShare: false #whether or not sharing css
    embeddedFiles: [] #file patterns, relative to <srcDir>, excluded while calculating sharing
  
  @taskName: 'dolphin-traversal'
  @taskDescription: 'Preprocessor that deal with htmls which use AMD module system, 
  and inject all the dependencies\' link into the right places. 
  Produce input htmls for grunt plugin "dolphin-optimizer."'

  @registerWithGrunt: (grunt)->
    grunt.registerMultiTask DepTraversalTask.taskName, DepTraversalTask.taskDescription, ->
      task = new DepTraversalTask(@)
      task.run()
      return
      
    return

module.exports = DepTraversalTask