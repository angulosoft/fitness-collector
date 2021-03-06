var squel = require("squel");
var mysql = require('mysql');
var _ = require('underscore');
var async = require('async');


var config = require("./config.js");

var myArgs = process.argv.slice(2);
console.log(myArgs)
var provider = require("./providers/"+myArgs[0]+".js")

var connection = mysql.createConnection(config.db);
connection.connect();

function processUsers(err, rows, fields) {
  if (err) throw err;
  console.info(rows.length + " users will be fetched");
  async.each(rows, function(one, callback) {

      function whenEnded(last_activity_date){

        // update timestamp with last activity ended database
        if (last_activity_date) {
            var query = squel.update()
                            .table('mivfit_oauth_proveedores')
                            .set('last_query', last_activity_date)
                            .where("idmivfit_oauth = ?", one.idmivfit_oauth);
            console.log(query.toString());
            connection.query(query.toString(),callback);
        } else {
          console.log("Skipping last_query update due to no activity");
          callback();
        }
      }

      // Send token, and last datetime to Provider handler
      activityObject = provider.getAndStoreActivities(one.IdAppProveedor, one.Id_Usuario, one.token, one.last_query, connection, whenEnded)


  },
  function(){
    connection.end();
    if( err ) {
      // One of the iterations produced an error.
      // All processing will now stop.
      console.error('A user failed to process', err);
      process.exit(1);
    } else {
      console.info('All users have been processed successfully');
      process.exit();
    }

  });
}


function getUsers(err, rows, fields) {
  if (err) throw err;
  console.log('Id for Provider', myArgs[0], 'is', rows[0].id);

  var query = squel.select()
                  .from('mivfit_oauth_proveedores')
                  .where("IdAppProveedor = ?", rows[0].id)
                  .order("last_query", true)
                  .limit(provider.LIMIT);
  if (myArgs.length == 2){
    query = query.where("Id_Usuario = ?", myArgs[1])
  }
  console.log(query.toString());

  connection.query(query.toString(), processUsers);
}


function proccessProvider(name) {
  // get provider
  var query = squel.select()
                  .field('idAppProveedor', 'id')
                  .from('mivfit_app_proveedores')
                  .where("Proveedor = ?", myArgs[0]);
  console.log(query.toString());

  connection.query(query.toString(), getUsers);

}

proccessProvider(myArgs[0])

// connection.end();
