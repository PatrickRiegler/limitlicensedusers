//exports.handler = function(event, context callback)
exports.handler = (event, context, callback) => {
  console.log("yes, executed")
  // context.done();
  callback(null, 'Script Successful');
};

