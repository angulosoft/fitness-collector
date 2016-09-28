var _ = require('underscore');
var async = require('async');
var squel = require('squel');
var moment = require('moment');

// Set up your client's options
var options = exports.options = {

    // Client ID (Required):
    // This value is the OAuth 2.0 client ID for your application.
    client_id : "2e897629ad3d4888884625b7afbbfdc2",

    // Client Secret (Required):
    // This value is the OAuth 2.0 shared secret for your application.
    client_secret : "78fce9487a8b4aed942b11ee402a41ff",

    // Authorization URL (Optional, default will work for most apps):
    // This is the URL to which your application should redirect the user in order to authorize access to his or her RunKeeper account.
    auth_url : "https://runkeeper.com/apps/authorize",

    // Access Token URL (Optional, default will work for most apps):
    // This is the URL at which your application can convert an authorization code to an access token.
    access_token_url : "https://runkeeper.com/apps/token",

    // Redirect URI (Optional but defaults to null, which means your app won't be able to use the getNewToken method):
    // This is the URL that RK sends user to after successful auth
    // URI naming based on Runkeeper convention
    redirect_uri : "http://www.miveri.es/app/crm/runkeeper.php/",

    // Access Token (Optional, defaults to null):
    // When doing Client API Calls on behalf of a specific user (and not getting a new Access Token for the first time), set the user's Access Token here.


    // API Domain (Optional, default will work for most apps):
    // This is the FQDN (Fully qualified domain name) that is used in making API calls
    api_domain : "api.runkeeper.com"
};

var runkeeper = require('runkeeper-js');

var client = new runkeeper.HealthGraph(options);

var LIMIT = 600;

var DEFAULT = 39; // Otros
var typesTranslator = {
  "Running" : 1,
  "Cycling" : DEFAULT ,
  "Mountain Biking" : DEFAULT,
  "Walking" : DEFAULT,
  "Hiking" : DEFAULT,
  "Downhill Skiing" : DEFAULT,
  "Cross-Country Skiing" : DEFAULT,
  "Snowboarding": DEFAULT ,
  "Skating" : DEFAULT,
  "Swimming" : 37,
  "Wheelchair" : DEFAULT,
  "Rowing" : DEFAULT,
  "Elliptical" : DEFAULT,
  "Other" : DEFAULT,
  "Yoga" : DEFAULT,
  "Pilates" : DEFAULT,
  "CrossFit" : DEFAULT,
  "Spinning" : DEFAULT,
  "Zumba": DEFAULT ,
  "Barre": DEFAULT ,
  "Group Workout" : DEFAULT,
  "Dance" : DEFAULT,
  "Bootcamp" : DEFAULT,
  "Boxing / MMA" : DEFAULT,
  "Meditation" : DEFAULT,
  "Strength Training" : DEFAULT,
  "Circuit Training" : DEFAULT,
  "Core Strengthening" : DEFAULT,
  "Arc Trainer" : DEFAULT,
  "Stairmaster / Stepwell" : DEFAULT,
  "Sports" : DEFAULT,
  "Nordic Walking": DEFAULT

}
function extractData(IdAppProveedor,IdUser, token, after, conn, cb){
  client.access_token = token;
  client.fitnessActivityFeed(function(err, data) {
    client.fitnessActivityFeed = data;

    //console.log(JSON.stringify(data));

    //Select last_query
    var sql = squel.select()
    .field("last_query")
    .from("mivfit_oauth_proveedores")
    .where("Id_Usuario = '?' AND IdAppProveedor = '?'",IdUser,IdAppProveedor);

    conn.query(sql.toString(), function(err, rows, fields){
      last_query = moment(rows[0]["last_query"]).format('YYYY-MM-DD HH:mm:ss');
      initial_date = moment("2000-09-27 00:00:00").format('YYYY-MM-DD HH:mm:ss');
      //console.log(initial_date == last_query);
      var items = data['items'];
      console.log("LAST QUERY: "+last_query);
      console.log(initial_date < last_query);
      if(initial_date < last_query){
        console.log("######## ENTRO");
        // si last_query es POSTERIOR a 2000, -> incluir solo las posteriores a la fecha
        items.some( function(activity, index, _ary){
          var start_date = moment(new Date(activity.start_time).toISOString()).format('YYYY-MM-DD HH:mm:ss');
          //console.log(start_date);
          if(start_date <= last_query){
            items = items.slice(0,index);
            return true;
          }
        });

      }
      //console.log(JSON.stringify(items));
      var last_activity_date;
      async.each(items, function(activity, callback){
        console.log(JSON.stringify(activity));
        var start_date = moment(new Date(activity.start_time).toISOString()).format('YYYY-MM-DD HH:mm:ss');
        var end_date = moment(start_date).add({'seconds':activity.duration}).format('YYYY-MM-DD HH:mm:ss');
        var result = {
          Id_Usuario: IdUser,
          IdActividad: activity.uri.split("/").pop(),
          IdAppProveedor: IdAppProveedor,
          IdTipoActividad: typesTranslator[activity.type] || DEFAULT,
          Duracion: activity.duration,
          Distancia: activity.total_distance,
          Velocidad: activity.total_distance/activity.duration,
          Pasos: activity.steps || null,
          Calorias: activity.total_calories,
          FechaInicioActividad: start_date,
          FechaFinActividad: end_date,
          Raw: JSON.stringify(activity)
        }
        if (!last_activity_date){
          last_activity_date = start_date;
          // console.log('update', last_activity_date);
        }
        client.activityId = result.IdActividad;


        var sql = squel.insert()
        .into("mivfit_datos")
        .setFields(result);
        console.log(sql.toString());

        conn.query(sql.toString(), callback);

      }, function(){
        cb(last_activity_date);
      })

    });

  });

}

module.exports = {
  'getAndStoreActivities': extractData,
  'LIMIT': LIMIT
}
