fs = require 'fs'
path = require 'path'

module.exports = do (dir = __dirname)->
	modulePaths = for file in fs.readdirSync(dir)
		continue if file is 'index.js'
		
		name = path.basename file, '.js'
		continue if name is 'test'

		dirPath = path.join dir, file

		stats = fs.statSync(dirPath)
		isFileOrDir = stats.isFile() or stats.isDirectory()

		continue if not isFileOrDir

		continue if stats.isFile() and not /\.js$/.test file
		[name,dirPath]
	
	modulePaths.reduce (result, pair)->
		result.__defineGetter__ pair[0],->
			try
				return require pair[1]
			catch e
				return undefined
		result
	,{}
	
