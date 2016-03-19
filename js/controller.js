(function(angular) {
  'use strict';
  function MirrorCtrl(
    AnnyangService,
    GeolocationService,
    WeatherService,
    MapService,
    HueService,
    CalendarService,
    ComicService,
    GiphyService,
    TrafficService,
    $scope, $timeout, $interval, tmhDynamicLocale) {
      var _this = this;
      var DEFAULT_COMMAND_TEXT = 'Say "What can I say?" to see a list of commands...';
      $scope.listening = false;

      //Change to enable debug buttons
      $scope.debug = false;
      var exec = require('child_process').exec;
      var exec2 = require('child_process').exec
      var moment = require('moment');

      //Music Flag
      var music_playing = false;
      $scope.focus = "default";
      $scope.user = {};
      $scope.commands = commands
      $scope.interimResult = DEFAULT_COMMAND_TEXT;

      $scope.layoutName = 'main';

      //set lang
      $scope.locale = config.language;
      tmhDynamicLocale.set(config.language.toLowerCase());
      moment.locale(config.language);
      console.log('moment local', moment.locale());

      

      //Update the time
      function updateTime(){
        $scope.date = new moment();
        var now = new moment();
        var hour = now.format('H');
        if (hour < 0) {
          hour = -hour
        }
        $scope.hour = hour;
        $scope.minutes = now.format('mm A');
      }

      // Reset the command text
      var restCommand = function(){
        $scope.interimResult = DEFAULT_COMMAND_TEXT;
      }

      _this.init = function() {
        var tick = $interval(updateTime, 1000);
        omx = require('omxcontrol');
        updateTime();
        GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
          console.log("Geoposition", geoposition);
          $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
        });
        restCommand();

	exec2('python2 /home/admin/smart-mirror/python_scripts/cl2.py',
        function(error, stdout, stderr) {
          $scope.notification = stdout;
	  console.log(stdout);
        });
	
	var mysql      = require('mysql');
	var connection = mysql.createConnection({
  		host     : 'localhost',
  		user     : 'root',
  		password : 'Quarkeater1996',
  		database : 'iot'
	});
	
        var refreshMirrorData = function() {
          //Get our location and then get the weather for our location
          GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
            console.log("Geoposition", geoposition);
            WeatherService.init(geoposition).then(function(){
              $scope.currentForcast = WeatherService.currentForcast();
              $scope.weeklyForcast = WeatherService.weeklyForcast();
              $scope.hourlyForcast = WeatherService.hourlyForcast();
              console.log("Current", $scope.currentForcast);
              console.log("Weekly", $scope.weeklyForcast);
              console.log("Hourly", $scope.hourlyForcast);

              var skycons = new Skycons({"color": "#aaa"});
              skycons.add("icon_weather_current", $scope.currentForcast.iconAnimation);

              skycons.play();

              $scope.iconLoad = function (elementId, iconAnimation){
                skycons.add(document.getElementById(elementId), iconAnimation);
                skycons.play();
              };

            });


          }, function(error){
            console.log(error);
          });

          CalendarService.getCalendarEvents().then(function(response) {
            $scope.calendar = CalendarService.getFutureEvents();
          }, function(error) {
            console.log(error);
          });

        };

        refreshMirrorData();
        $interval(refreshMirrorData, 1500000);

        var greetingUpdater = function () {
          if(!Array.isArray(config.greeting) && typeof config.greeting.midday != 'undefined') {
            var hour = moment().hour();
            var geetingTime = "midday";

            if (hour > 4 && hour < 11) {
              geetingTime = "morning";
            } else if (hour > 18 && hour < 23) {
              geetingTime = "evening";
            } else if (hour >= 23 || hour < 4) {
              geetingTime = "night";
            }

            $scope.greeting = config.greeting[geetingTime][Math.floor(Math.random() * config.greeting.morning.length)];
          } else if (Array.isArray(config.greeting)) {
            $scope.greeting = config.greeting[Math.floor(Math.random() * config.greeting.length)];
          }
        };
        greetingUpdater();
        $interval(greetingUpdater, 120000);

        var refreshTrafficData = function() {
          TrafficService.getTravelDuration().then(function(durationTraffic) {
            console.log("Traffic", durationTraffic);
            $scope.traffic = {
              destination: config.traffic.name,
              duration : durationTraffic
            };
          }, function(error){
            $scope.traffic = {error: error};
          });
        };

        refreshTrafficData();
        $interval(refreshTrafficData, config.traffic.reload_interval * 60000);

        var refreshComic = function () {
          console.log("Refreshing comic");
          ComicService.initDilbert().then(function(data) {
            console.log("Dilbert comic initialized");
          }, function(error) {
            console.log(error);
          });
        };

        refreshComic();
        $interval(refreshComic, 12*60*60000); // 12 hours

        var defaultView = function() {
          console.debug("Ok, going to default view...");
          $scope.focus = "default";
        }

        //AnnyangService.setLanguage('de-DE');

        //IFTTT
        AnnyangService.addCommand(commands['connect']['voice'], function() {
          console.debug("IFTTT");
          exec('./smart-mirror/python_scripts/send.sh');
        });

        // List commands
        AnnyangService.addCommand(commands['list']['voice'], function() {
          console.debug("Here is a list of commands...");
          console.log(AnnyangService.commands);
          $scope.focus = "commands";
        });

        // Go back to default view
        AnnyangService.addCommand(commands['home']['voice'], defaultView);

        // Hide everything and "sleep"
        AnnyangService.addCommand(commands['sleep']['voice'], function() {
          console.debug("Ok, going to sleep...");
          $scope.focus = "sleep";
        });

        // Go back to default view
        AnnyangService.addCommand(commands['wake_up']['voice'], function() {
          defaultView();
        });

        // Show debug information
        AnnyangService.addCommand(commands['debug']['voice'], function() {
          console.debug("Boop Boop. Showing debug info...");
          $scope.debug = true;
        });

        // Show map
        AnnyangService.addCommand(commands['map_show']['voice'], function() {
          console.debug("Going on an adventure?");
          GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition) {
            console.log("Geoposition", geoposition);
            $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
            $scope.focus = "map";
          });
        });

        // Hide everything and "sleep"
        AnnyangService.addCommand(commands['map_location']['voice'], function(location) {
          console.debug("Getting map of", location);
          $scope.map = MapService.generateMap(location);
          $scope.focus = "map";
        });

        // Zoom in map
        AnnyangService.addCommand(commands['map_zoom_in']['voice'], function() {
          console.debug("Zoooooooom!!!");
          $scope.map = MapService.zoomIn();
        });

        //Zoom out map
        AnnyangService.addCommand(commands['map_zoom_out']['voice'], function() {
          console.debug("Moooooooooz!!!");
          $scope.map = MapService.zoomOut();
        });

        //Zoom to
        AnnyangService.addCommand(commands['map_zoom_point']['voice'], function(value) {
          console.debug("Moooop!!!", value);
          $scope.map = MapService.zoomTo(value);
        });

        //Map zoom reset
        AnnyangService.addCommand(commands['map_zoom_reset']['voice'], function() {
          console.debug("Zoooommmmmzzz00000!!!");
          $scope.map = MapService.reset();
          $scope.focus = "map";
        });

        //Change greeting
        AnnyangService.addCommand(commands['change_greeting']['voice'], function(name) {
          console.debug("Changing greeting");
          $scope.greeting = name;
          $scope.focus = "default"
        });


        // Search images
        AnnyangService.addCommand(commands['images_search']['voice'], function(term) {
          console.debug("Showing", term);
        });

        // Change name
        AnnyangService.addCommand(commands['account_set_name']['voice'], function(name) {
          console.debug("Hi", name, "nice to meet you");
          $scope.user.name = name;
        });

        // Play music - Author:chrispanag
        AnnyangService.addCommand(commands['music']['voice'], function() {

          //If music is not playing play some music
          if (!music_playing) {
            console.debug("Playing some music...");

            omx.start('music/test.mp3');
            music_playing = true;
          } else {
            console.debug('Music is already playing');
          }

          $scope.focus = "songs";
        });

        // Stop music - Author:chrispanag
        AnnyangService.addCommand(commands['pause']['voice'], function() {

          if (music_playing) {
            console.debug("Stop playing music");
            exec('pkill -f omxplayer');
            music_playing = false;
          } else {
            console.debug("Music is not playing");
          }
          $scope.focus = "default";
        });

        // Set a reminder
        AnnyangService.addCommand(commands['reminder_insert']['voice'], function(task) {
          console.debug("I'll remind you to", task);
        });

        // Clear reminders
        AnnyangService.addCommand(commands['reminder_clear']['voice'], function() {
          console.debug("Clearing reminders");
        });

        // Check the time
        AnnyangService.addCommand(commands['time_show']['voice'], function(task) {
          console.debug("It is", moment().format('h:mm:ss a'));
        });

        // Turn lights off
        AnnyangService.addCommand(commands['light_action']['voice'], function(state, action) {
          HueService.performUpdate(state + " " + action);
        });

        //Show giphy image
        AnnyangService.addCommand(commands['image_giphy']['voice'], function(img) {
          GiphyService.init(img).then(function(){
            $scope.gifimg = GiphyService.giphyImg();
            $scope.focus = "gif";
          });
        });

        // Change name
        AnnyangService.addCommand(commands['account_set_hate']['voice'], function(name) {
          console.debug("Hi", name, "I hate you");
          $scope.user.name = "Malakas";
          $scope.focus = "default";
          angular.module('music', ['angularSoundManager'])
        });

        // Show xkcd comic
        AnnyangService.addCommand(commands['image_comic']['voice'], function(state, action) {
          console.debug("Fetching a comic for you.");
          ComicService.getXKCD().then(function(data) {
            $scope.xkcd = data.img;
            $scope.focus = "xkcd";
          });
        });

        // Show Dilbert comic
        AnnyangService.addCommand('Show Dilbert (comic)', function(state, action) {
          console.debug("Fetching a Dilbert comic for you.");
          $scope.dilbert = ComicService.getDilbert("today");  // call it with "random" for random comic
          $scope.focus = "dilbert";
        });

        var resetCommandTimeout;
        //Track when the Annyang is listening to us
        AnnyangService.start(function(listening) {
          $scope.listening = listening;
        }, function(interimResult) {
          $scope.interimResult = interimResult;
          $timeout.cancel(resetCommandTimeout);
        }, function(result) {
          $scope.interimResult = result[0];
          resetCommandTimeout = $timeout(restCommand, 5000);
        });
      };

      _this.init();
    }

    angular.module('SmartMirror')
    .controller('MirrorCtrl', MirrorCtrl);

    function themeController($scope) {
      $scope.layoutName = (typeof config.layout != 'undefined' && config.layout)?config.layout:'main';
    }

    angular.module('SmartMirror')
    .controller('Theme', themeController);

  } (window.angular));
