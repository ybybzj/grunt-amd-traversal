path = require 'path'

changeExtName = (fpath, ext)->
	ext = if ext.charAt(0) is '.' then ext else '.' + ext 
	oext = path.extname fpath
	return path.dirname(fpath) + '/'+path.basename(fpath, oext) + ext
checkFileExt = (ext, str)->
	reg = new RegExp('\\.' + ext + '([\\?#]\\S+)?$', 'i')
	reg.test(str)
normalizeBasePath = (basePath)->
		return '' if basePath.length is 0 
		if basePath[basePath.length - 1] isnt '/'
			basePath + '/'
		else basePath
isUrl = (str) ->
	/^(\S+:)?\/\//i.test(str.trim())

resolveRelativePath = (relTo,relPath)->
	return relPath if relPath.charAt(0) isnt '.'

	parts = relPath.split('/')
	parentBase = relTo.split('/').slice(0, -1)

	for part in parts
		switch part
			when '..'
				parentBase.pop()
			when '.'
				break
			else
				parentBase.push part

	return parentBase.join '/'

pathToUrl = (p)->
	p.replace(/\\{1,2}/g,->"/")
unixifyPath = (filepath)->
    if process.platform is 'win32' 
    	filepath.replace(/\\{1,2}/g,"/")
    else 
    	filepath
_getUrlExtension = (url)->
	match = url.match /\.(\w+)(?:[\?#]\S+)?$/i
	match?[1]

getResourceType = (url)->
	# console.log url
	switch _getUrlExtension(url)
		when 'js'
			'script'
		when 'css'
			'stylesheet'
		when 'html','txt','text','json','xml'
			'text'
		else
			null
		


getFileNameWithoutExt = (p)->
	path.basename p, path.extname p

changeFileNameWithoutExt = (p, newName)->
	return undefined if not p?
	pathToUrl path.join path.dirname(p),newName+path.extname(p)

exports.changeExtName = changeExtName
exports.checkFileExt = checkFileExt
exports.normalizeBasePath = normalizeBasePath
exports.isUrl = isUrl
exports.resolveRelativePath = resolveRelativePath
exports.pathToUrl = pathToUrl
exports.unixifyPath = unixifyPath
exports.getResourceType = getResourceType
exports.getFileNameWithoutExt = getFileNameWithoutExt
exports.changeFileNameWithoutExt = changeFileNameWithoutExt