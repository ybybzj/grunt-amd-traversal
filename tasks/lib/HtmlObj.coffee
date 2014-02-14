grunt = require 'grunt'
Util = require './util'
_ = require 'underscore'
PATH = require 'path'
Promise = Util.promise
Chalk = require 'chalk'

#global regexes
scriptNodeReg = /<script[^>]*>(?:[\s\S]*?)<\/script\s*>/ig
scriptSrcReg = /^<script[^>]+src=(?:"|')\s*(\S+)\s*(?:"|')/i
scriptTagReg = /<(\/)?script(\s+[^>]+)*>/ig
beginningScriptTagReg = /(^<script(?:\s+[^>]+)*)>/i
corejsReg = /(\/)?core((?:\.min)?\.js)/i
endingHeadTagReg = /(<\/\s*head\s*>)/i
#helpers
genModuleName = do (prefix = 'anonymous_')->
	i = 1
	-> prefix + (i++)

wrapWithComment = (str)->if str then "\n\t<!--inserted by dolphin-traversal begin-->#{str}\n\t<!--inserted by dolphin-traversal end-->\n" else ""
_toJsStr = (jsCode)-> 
	jsCode.replace(/\\/g,'\\\\')
		.replace(/"/g,'\\\"')
		.replace(/'/g,'\\\'')
		# .replace(/\s+/g,' ')
		.replace(/\s*(\n|\r|\r\n)\s*/g, '')
_getMatchPhrase = (input, reg)->
	result = input.match reg
	result?[1]

_getDefineArgs = (args)->
	factory = -> 
	deps = []
	name = genModuleName()
	switch args.length
    when 1
      factory = args[0]
    when 2
      factory = args[1]
      if typeof args[0] is 'string'
        name = args[0]
      else
      	deps = args[0]
    when 3
    	name = args[0]
    	deps = args[1]
    	factory = args[2]
  [name, deps, factory]

#HtmlObj Class
class HtmlObj
	constructor: (@paths,@options)->
		@init()
	init: ->
		@depsNameIndex = []
		@depsStylesheet = []
		@modules = 
			'bjt':
				url: null
			'Module':
				url: null
			'globalSetting':
				url: null
		@globalPathSetting = {}
		@fileBasePath = PATH.dirname @paths.src
		# console.log(@options.sharedOutputPaths)
		@sharedOutputPaths = @options.sharedOutputPaths
		@content = grunt.file.read(@paths.src)
		@initScripts()
		grunt.log.ok "htmlObj created! (#{Chalk.gray @paths.src})"

	initScripts:->
		pos = 1
		style_pos = 1
		@orgScripts = []
		insertScript = wrapWithComment '\n<script type="text/javascript" data-how="embedded">define(["globalSetting"], function(GS){GS.setStatus("online");}).executeit();</script>\n'
		#prepare scripts
		@content = @content.replace scriptNodeReg, (scontent)=>
			placeholderStr = '<script-placeholder-begin>'+pos+'<script-placeholder-end>'
			href = _getMatchPhrase scontent, scriptSrcReg
			scriptObj = 
				htmlStr:if corejsReg.test scontent then scontent.replace(corejsReg,(m, b, a)->(b||'')+'core-lite'+(a||'')).replace(beginningScriptTagReg,(m,b)->b+' data-how="embedded">')+insertScript else scontent 
			scriptObj.pos = pos
			if href
				scriptObj.url = if Util.fs.isUrl href then href else PATH.join(@fileBasePath,href)
				scriptObj.src = Util.getContent(scriptObj.url) 
			else 
				scriptObj.src = Promise.resolve(scontent.replace(scriptTagReg,''))
			@orgScripts.push scriptObj

			pos += 1
			if pos-1 is 1 #prepare stylesheets: insert stylesheets before the first script node
				'\n<insert-stylesheets-placeholder>\n'+placeholderStr
			else 
				placeholderStr

	processScripts: ->
		@orgScripts.reduce((seq, script)=>
					seq.then(->script.src)
					.then((content)->script.content = content;script)
					.then(@_exeDefineSrcipt)
				, Promise.resolve())
		.then(=>@)

	postScriptsProcess: ->
		amdScripts = @orgScripts.filter (scriptObj)-> scriptObj.moduleName?
		_beginIndex = 0
		_endIndex = 0
		for as in amdScripts
			_endIndex = _.indexOf(@depsNameIndex,as.moduleName)
			as.depsName = @depsNameIndex[_beginIndex..._endIndex]
			as.postContent = if @_pathSettingModuleName is as.moduleName
					as.htmlStr = as.htmlStr.replace(beginningScriptTagReg,(m,b)->b+' data-how="embedded">')
					"#{as.htmlStr}\n#{wrapWithComment('<shared-scripts-placeholder>')}\n"
				else
					"#{wrapWithComment(@_makeSrcContent(as))}#{as.htmlStr}"
			_beginIndex = _endIndex+1

		indexScripts = _.indexBy(@orgScripts,'pos')

		@content = @content.replace /<insert-stylesheets-placeholder>/i,(placeHolder)=>
			wrapWithComment @_makeShareContent('css')+@depsStylesheet.join("")
		# replace script
		@content = @content.replace /<script-placeholder-begin>(\d+)<script-placeholder-end>/ig,(placeHolder, pos)=>
			if indexScripts[pos].postContent?
				indexScripts[pos].postContent.replace /<shared-scripts-placeholder>/i,(placeHolder)=>
					@_makeShareContent('js')
			else indexScripts[pos].htmlStr
		grunt.file.write @paths.dest,@content
		grunt.log.ok Chalk.gray @paths.dest
		@content
	
	#create script link node html string base on module name passed in
	_makeHtmlSrcLink: (mn)=>
		if not Util.fs.checkFileExt 'css',mn
			"\n<script type=\"text/javascript\" src=\"#{@modules[mn].url}\" #{if @modules[mn].generated is true then 'dolphin-traversal-generated' else ''}></script>"
		else
			"\n<link rel=\"stylesheet\"  type=\"text/css\" href=\"#{@modules[mn].url}\"/>"
	
	_makeSrcContent: (scriptObj)=>
		scriptObj.depsName.map((mn)=>
			return '' if  @sharedModules and @sharedModules[mn]
			if not Util.fs.checkFileExt 'css',mn
				@_makeHtmlSrcLink mn
			else
				@depsStylesheet.push @_makeHtmlSrcLink mn
				''
		).join('')

	_makeShareContent: (type)->
		# console.log @sharedModules
		if @sharedModulesIndex and @sharedModulesIndex[type] and @sharedModulesIndex[type].length > 0
			if type is 'js'
				"\n<script type=\"text/javascript\" src=\"#{Util.fs.pathToUrl PATH.relative(@fileBasePath,@sharedOutputPaths.js)}\" data-how=\"external\"></script>"
			else
				"\n<link rel=\"stylesheet\"  type=\"text/css\" href=\"#{Util.fs.pathToUrl PATH.relative(@fileBasePath,@sharedOutputPaths.css)}\" #{if @options.cssShare then 'data-how=\"external\"' else ''}/>"
		else
			""
	
	_getUrlByModuleName: (mn) ->
		prefixPath = @globalPathSetting[mn.split('/')[0]]
		mn += '.js' unless (/\S+\.\S+$/i).test(mn)
		if prefixPath?
			mn = Util.fs.normalizeBasePath(prefixPath) + mn
		mn

	_exeDefineSrcipt: (script)=>
		define = @define
		return Promise.resolve() if /core_file_load_success/.test script.content
		
		if /define\s*\([^\)]+\)/i.test script.content
			# console.log script.content
			eval(script.content).then((name)=>script.moduleName = name)
		else
			Promise.resolve()

	_registerModule: (moduleName,deps)->
		# console.log moduleName
		@modules[moduleName] = 
			url: 
				if Util.fs.getResourceType(moduleName) is 'text'
					@._getUrlByModuleName(moduleName) + '.js'
				else 
					@._getUrlByModuleName(moduleName)
			deps: deps
		@modules[moduleName].generated = true if Util.fs.getResourceType(moduleName) is 'text'
		@depsNameIndex.push moduleName

	define: =>
		define = @define
		[name, deps, factory] = _getDefineArgs(arguments)
		deps = deps.map _.partial Util.fs.resolveRelativePath,name
		self = @
		
		promise = (Promise.reduce deps,(depModuleName)->
				if self.modules[depModuleName]
					return Promise.resolve()
				else if Util.fs.checkFileExt 'css', depModuleName
					self._registerModule depModuleName,[]
					return Promise.resolve()
				else
					# console.log depModuleName
					moduleFilePath = PATH.join self.fileBasePath,self._getUrlByModuleName depModuleName
					return Util.getContent moduleFilePath
					.then (content)->
						# console.log content if Util.fs.getResourceType(moduleFilePath) is 'text'
						if Util.fs.getResourceType(moduleFilePath) is 'text'
							content = "define('#{depModuleName}',[],function(){return \"#{_toJsStr content}\";});"
							grunt.file.write moduleFilePath+'.js',content
						eval(content)
			).then ->
				self._registerModule name, deps
				name

		promise.executeit = ->
			@then ->
				if _.isEqual(deps, ['globalSetting']) and (/\.setPath/).test(factory.toString())
    			factory({
    				setPath: (pSetting)->
    					_.extend(self.globalPathSetting, pSetting)
    			})
    			self._pathSettingModuleName = name
    		name
		promise
			
	  
	    
module.exports = HtmlObj