Promise = (require 'es6-promise').Promise
Promise.allSync = (promises)->
  (processFn)->
    promises.reduce (seq,promise)->
      seq.then(->promise).then(processFn)
    ,Promise.resolve()
Promise.inOrder = (array)->
	(processFn)->
		array.reduce (seq, item)->
			seq.then(->processFn.call null,item)
		,Promise.resolve()
Promise.reduce = (promises, processFn)->
	promises.reduce (seq,promise)->
      seq.then(->promise).then(processFn)
    ,Promise.resolve()
module.exports = Promise