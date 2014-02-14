Promise = (require 'es6-promise').Promise
Http = require 'http'
grunt = require 'grunt'
File = require 'fs'
Util = require './fs'
module.exports = (location)->
	_content = ''
	new Promise (resolve, reject)->
		if Util.isUrl(location)
			Http.get location, (res)->
				res.on 'data', (data)->
					_content += data
				res.on 'end', ->
					# grunt.log.okln("Got response: " + _content)
					resolve(_content)
				res.on 'error', (e)->
					e.location = location
					# grunt.log.error("Got error from [" + location + "]:\n" + e.message);
					reject(e)
			return
		else
			try 
				_content = File.readFileSync(location.replace(/[?#]\S+$/i,'')).toString()
				# grunt.log.okln("Got response: " + _content)
				resolve(_content)
			catch e
				e.location = location
				# grunt.log.error("Got error from [" + location + "]:\n" + e.message);
				reject(e)
				
			
		
