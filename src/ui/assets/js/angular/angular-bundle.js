// Global Angular App Declaration
var AngularApp = angular.module("AngularApp",
    [
        "ngSanitize",
        "ngAnimate",
        "ngMessages",
        "ui.router",
        "ui.bootstrap",
        "toastr",
        "leaflet-directive"
    ]);
// Configure Angular App Preferences
AngularApp.config(["toastrConfig", function (toastrConfig)
{
    toastrConfig.autoDismiss = true;
    toastrConfig.positionClass = "toast-bottom-center";
    toastrConfig.preventOpenDuplicates = true;
}]);
AngularApp.config(["$logProvider", function ($logProvider)
{
    $logProvider.debugEnabled(false);
}]);
/*

(function()
{
    var googleMapProvider;
    
    AngularApp.config(function (uiGmapGoogleMapApiProvider)
    {
        googleMapProvider = uiGmapGoogleMapApiProvider;
    });
    
    AngularApp.run(function(ApiService)
    {
        ApiService.get("/config/getGoogleMapsApiKey")
            .success(function(response)
            {
                googleMapProvider.configure({
                    key: response.data
                });
            });
    });
})();
*/

// Configure Angular App Routes
AngularApp.config(["$stateProvider", "$urlRouterProvider", "$locationProvider", function ($stateProvider, $urlRouterProvider, $locationProvider)
{
    $locationProvider.html5Mode(false);
}]);
// Configure Angular App Initialization

AngularApp.service("IconHelperService", function IconHelperService()
{
    var self = this;
    
    self.getPokemonSmallIconPath = function (pokedexId)
    {
        return "assets/images/pokemon/go-sprites/small/" + pokedexId + ".png";
    };
    self.getPokemonBigIconPath = function (pokedexId)
    {
        return "assets/images/pokemon/go-sprites/big/" + pokedexId + ".png";
    };
    self.getPokestopIconPath = function ()
    {
        return "assets/images/map/pokestop.png";
    };
    self.getPokestopLuredIconPath = function ()
    {
        return "assets/images/map/pokestoppink.png";
    };
    self.getPokemonTeamIcon = function (team)
    {
        var arenaLogo;
        
        switch (team)
        {
            case "Mystic":
                arenaLogo = "arena_blue";
                break;
            case "Instinct":
                arenaLogo = "arena_yellow";
                break;
            case "Valor":
                arenaLogo = "arena_red";
                break;
            default:
                arenaLogo = "arena_white";
                break;
        }
        
        return "assets/images/map/" + arenaLogo + ".png";
    };
});
AngularApp.service("LocationHelperService", ["$q", "ApiService", function LocationHelperService($q, ApiService)
{
    var self = this;
    
    self.reverseGeocode = function(locationName)
    {
        var def = $q.defer();
        
        ApiService.post("/location/reverseGeocode", {location:locationName})
            .success(function(response)
            {
                def.resolve(response.data);
            });
        
        return def.promise;
    };
}]);
AngularApp.service("MapObjectService", ["$q", "ApiService", "PokemonDataService", "IconHelperService", function MapObjectService($q, ApiService, PokemonDataService, IconHelperService)
{
    var self = this;
    
    self.getPokemonMarkers = function (latitude, longitude)
    {
        var def = $q.defer();
        
        ApiService.post("/map/getMapObjects", {latitude: latitude,longitude: longitude})
            .success(function (response)
            {
                var center = response.data.center;
                
                var markers = response.data.markers
                    .map(function (marker)
                    {
                        return composeMarker(marker);
                    });
                
                $q.all(markers)
                    .then(function (markers)
                    {
                        def.resolve({
                            center: center,
                            markers: markers
                        });
                    });
            });
        
        return def.promise;
    };
    
    function composeMarker(marker)
    {
        var def = $q.defer();
        
        if(marker.type === "pokemon")
        {
            def.resolve(composeMarkerWithPokemon(marker));
        }
        else if(marker.type === "pokestop")
        {
            def.resolve(composeMarkerWithPokestop(marker));
        }
        else if(marker.type === "arena")
        {
            def.resolve(composeMarkerWithArena(marker));
        }
        
        return def.promise;
    }
    
    function composeMarkerWithPokemon(marker)
    {
        var def = $q.defer();
        
        PokemonDataService.getPokemon(marker.pokedexId)
            .then(function (pokemon)
            {
                marker.pokemon = pokemon;
                
                marker.icon = {
                    iconUrl: IconHelperService.getPokemonSmallIconPath(marker.pokedexId),
                    iconAnchor: [24, 24],
                    popupAnchor: [0, -30],
                    layer: marker.type
                };
                
                delete marker.pokedexId;
                
                def.resolve(marker);
            });
        
        return def.promise;
    }
    
    function composeMarkerWithPokestop(marker)
    {
        var def = $q.defer();
        
        var icon;
        if(marker.lured)
            icon = IconHelperService.getPokestopLuredIconPath();
        else
            icon = IconHelperService.getPokestopIconPath();
        
        marker.icon = {
            iconUrl: icon,
            iconAnchor: [8, 25],
            popupAnchor: [0, -30],
            layer: marker.type
        };
        
        def.resolve(marker);
        
        return def.promise;
    }
    
    function composeMarkerWithArena(marker)
    {
        var def = $q.defer();
                
        marker.icon = {
            iconUrl: IconHelperService.getPokemonTeamIcon(marker.team),
            iconAnchor: [20, 20],
            popupAnchor: [0, -28],
            layer: marker.type
        };
        
        def.resolve(marker);
        
        return def.promise;
    }
}]);
AngularApp.service("PokemonDataService", ["$q", "ApiService", function PokemonDataService($q, ApiService)
{
    var self = this;
    
    var pokemonDataDeferrred = $q.defer();
    
    var pokemonDataPromise = pokemonDataDeferrred.promise;
    
    var getAllPokemons = function ()
    {
        ApiService.post("/pokemon/getAllPokemons")
            .success(function (response)
            {
                pokemonDataDeferrred.resolve(response.data);
            });
    };
    getAllPokemons();
    
    self.getPokemon = function (pokedexId)
    {
        var def = $q.defer();
        
        pokemonDataPromise
            .then(function (pokemons)
            {
                var pokemon = pokemons.filter(p => (p.pokedexId) === pokedexId)[0];
                                
                def.resolve(pokemon || null);
            });
        
        return def.promise;
    }
}]);
AngularApp.service("ApiService", ["$http", function ApiService($http)
{
    var self = this;
    
    var baseUrl = "http://localhost:32598";
    
    var bindMethods = function ()
    {
        for (var i = 0; i < arguments.length; i++)
        {
            var arg = arguments[i];
            
            self[arg] = (function(method)
            {
                return function (apiUrl, config)
                {
                    apiUrl = formatApiUrl(apiUrl);
                    
                    return $http[method](baseUrl + apiUrl, config);
                }
            })(arg);
        }
    };
    
    var bindMethodsWithData = function ()
    {
        for (var i = 0; i < arguments.length; i++)
        {
            var arg = arguments[i];
            
            self[arg] = (function(method)
            {
                return function (apiUrl, data, config)
                {
                    apiUrl = formatApiUrl(apiUrl);
                    
                    return $http[method](baseUrl + apiUrl, data, config);
                }
            })(arg);
        }
    };
    
    var formatApiUrl = function(url)
    {
        return url[0] === "/" ? url : "/" + url;
    };
    
    bindMethods("get", "delete", "head", "jsonp");
    bindMethodsWithData("post", "put", "patch");
}]);
AngularApp.filter("expiration", function ()
{
    return function (milliseconds)
    {
        var mins = milliseconds / 1000 / 60;
        
        if (mins < 1)
            return "Less than a minute";
        
        var days = milliseconds / 1000 / 60 / 60 / 24;
        
        if (days > 7)
            return "An eternity";
        
        return moment.duration(milliseconds, "ms").format("d[d] h[h] m[m]");
    };
});
AngularApp.directive("pokemonType", function ()
{
    return {
        restrict: "A",
        scope: {
            pokemonType: "@"
        },
        templateUrl: "templates/core/directives/pokemon-type/PokemonType.template.html",
        link: function (scope, element, attrs)
        {
            scope.$watch("pokemonType", function (newVal)
            {
                if (!newVal)
                    return;
                
                scope.types = scope.pokemonType
                    .split("/")
                    .map(function (type)
                    {
                        return type.trim();
                    });
            });
        }
    }
});
AngularApp.directive("infoPanel", function ()
{
    return {
        restrict: "EA",
        scope: {},
        transclude: true,
        templateUrl: "templates/core/directives/info-panel/InfoPanel.template.html",
        link: {
            pre: function (scope, element, attrs)
            {
                scope.panelShown = true;
                
                scope.togglePanel = function()
                {
                    scope.panelShown = !scope.panelShown;
                };
            },
            post: function (scope, element, attrs)
            {
                
            }
        }
    }
});
AngularApp.component("markerPopupComponent", {
    templateUrl: "templates/app/map/marker-popup/MarkerPopup.template.html",
    bindings: {
        marker: "="
    }
});
AngularApp.component("homeComponent", {
    controller: "HomeController as Home",
    templateUrl: "templates/app/home/Home.template.html"
});
AngularApp.controller("HomeController", ["$scope", "$compile", "MapObjectService", function HomeController($scope, $compile, MapObjectService)
{
    var self = this;
}]);
AngularApp.config(["$stateProvider", function ($stateProvider)
{
    $stateProvider.state("home",
        {
            url: "/",
            template: "<home-component></home-component>",
            onEnter: ["$rootScope", function($rootScope)
            {
                $rootScope.PageName = "Home"
            }]
        });
}]);
AngularApp.component("locationSearchComponent", {
    controller: "LocationSearchController as LocationSearch",
    templateUrl: "templates/app/location-search/LocationSearch.template.html",
    bindings: {
        coords: "="
    }
});
AngularApp.controller("LocationSearchController", ["$scope", "LocationHelperService", function LocationSearchController($scope, LocationHelperService)
{
    var self = this;
        
    self.searchLocation = function()
    {
        if(!self.searchInput)
            return;
        
        LocationHelperService.reverseGeocode(self.searchInput)
            .then(function(coords)
            {
                self.coords = coords;
            });
    };
}]);
AngularApp.component("mapComponent", {
    controller: "MapController as Map",
    templateUrl: "templates/app/map/Map.template.html"
});
AngularApp.controller("MapController", ["$scope", "$rootScope", "$location", "MapObjectService", function MapController($scope, $rootScope, $location, MapObjectService)
{
    var self = this;
    
    // On load check URL for location coords
    var urlParams = $location.search();
    var urlLat = parseFloat(urlParams.lat);
    var urlLng = parseFloat(urlParams.lng);
    var urlZoom = parseFloat(urlParams.zoom);
    
    self.markers = [];
    
    self.options = {
        center: {
            lat: urlLat || 40.095,
            lng: urlLng || -3.823,
            zoom: urlZoom || 16
        },
        defaults: {
            minZoom: 16,
            maxZoom: 18
        },
        controls: {
            scale: true
        },
        layers: {
            baselayers: {
                googleRoadmap: {
                    name: "Google Streets",
                    layerType: "ROADMAP",
                    type: "google"
                }
            }
        }
    };
    
    // Marker popup events
    var popupTemplate = "<marker-popup-component marker='markerPopupModel'></marker-popup-component>";
    
    $scope.$on("leafletDirectiveMarker.pokemap.mouseover", function (event, args)
    {
        // The popup is compiled with root scope apparently
        $rootScope.markerPopupModel = args.model;
        
        args.leafletObject
            .bindPopup(popupTemplate, {autopan: false})
            .openPopup();
    });
    $scope.$on("leafletDirectiveMarker.pokemap.mouseout", function (event, args)
    {
        args.leafletObject.closePopup().unbindPopup();
    });
    
    // Debounced Heartbeat retrieval that will be called on specific Google Map Events
    var debouncedHeartbeat = _.debounce(function (latitude, longitude)
    {
        MapObjectService.getPokemonMarkers(latitude, longitude)
            .then(function (data)
            {
                if (self.options.center.lat === data.center.lat && self.options.center.lng === data.center.lng)
                    self.markers = data.markers;
            });
        
    }, 500);
    
    // Center Watch for coordinates
    $scope.$watch(function ()
        {
            return self.options.center;
        },
        function (newVal)
        {
            if (!newVal)
                return;
            
            debouncedHeartbeat(newVal.lat, newVal.lng);
            
            $location.search({
                lat: newVal.lat,
                lng: newVal.lng,
                zoom: newVal.zoom
            });
        },
        true);
    
    // Search box Watch for coordinates
    $scope.$watch(function ()
        {
            return self.searchCoords;
        },
        function (newVal)
        {
            if (!newVal)
                return;
            
            self.options.center.lat = newVal.latitude;
            self.options.center.lng = newVal.longitude;
        });
    
}]);
angular.module("AngularApp").run(["$templateCache", function($templateCache) {$templateCache.put('templates/app/home/Home.template.html','<info-panel>\r\n    <div class="row">\r\n        <div class="col-xs-6">\r\n            <small class="text-muted">Latitude</small>\r\n            <div>{{Home.current.coords.latitude | number:6}}</div>\r\n        </div>\r\n        <div class="col-xs-6">\r\n            <small class="text-muted">Longitude</small>\r\n            <div>{{Home.current.coords.longitude | number:6}}</div>\r\n        </div>\r\n    </div>\r\n</info-panel>\r\n\r\n<map-component></map-component>\r\n\r\n<!--\r\n<ui-gmap-google-map center="Home.mapOptions.center" zoom="Home.mapOptions.zoom" options="Home.mapOptions.options" control="Home.map">\r\n\r\n    &lt;!&ndash; Pokemon Markers &ndash;&gt;\r\n    <ui-gmap-markers models="Home.markers" events="Home.pokemonMarkerEvents" coords="\'coords\'" idKey="\'id\'" events="" options="\'options\'"></ui-gmap-markers>\r\n\r\n    &lt;!&ndash; Center Marker &ndash;&gt;\r\n    <ui-gmap-marker coords="Home.current.coords" idKey="\'GOOGLE_MAPS_CENTER_MARKER\'"></ui-gmap-marker>\r\n\r\n</ui-gmap-google-map>\r\n-->\r\n');
$templateCache.put('templates/app/location-search/LocationSearch.template.html','<div class="navbar navbar-default navbar-fixed-top">\r\n    <div class="container-fluid clearfix">\r\n        <div class="col-lg-offset-1 col-lg-10 col-xs-12">\r\n            <div class="pull-left text-center clearfix">\r\n                <div class="navbar-brand">\r\n                    <img class="navbar-image pull-left" src="assets/images/logo-small.png" height="40">\r\n                    <div class="pull-left">\r\n                        <span class="visible-md visible-lg">\r\n                            Pok\xE9Scanner\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n            <div class="col-xs-10 col-md-8">\r\n                <form class="navbar-form" ng-submit="LocationSearch.searchLocation()" novalidate>\r\n                    <div class="input-group search-input-group">\r\n                        <input type="text" class="form-control input-lg" placeholder="Search for location... e.g. Times Square, NY" ng-model="LocationSearch.searchInput">\r\n\r\n                        <div class="input-group-btn">\r\n                            <button type="submit" class="btn-lg btn-default">\r\n                                <span class="fa fa-lg fa-search"></span>\r\n                            </button>\r\n                        </div>\r\n                    </div>\r\n                </form>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>');
$templateCache.put('templates/app/map/Map.template.html','<location-search-component coords="Map.searchCoords"></location-search-component>\r\n\r\n<leaflet id="pokemap" center="Map.options.center" controls="Map.options.controls" defaults="Map.options.defaults" layers="Map.options.layers" markers="Map.markers">\r\n</leaflet>\r\n');
$templateCache.put('templates/app/map/marker-popup/MarkerPopup.template.html','<div class="info-window text-center">\r\n    <div ng-switch="$ctrl.marker.type">\r\n\r\n        <!-- Pokemon -->\r\n        <div ng-switch-when="pokemon">\r\n            <div>\r\n                <img ng-src="assets/images/pokemon/go-sprites/big/{{$ctrl.marker.pokemon.pokedexId}}.png" width="90">\r\n            </div>\r\n            <h5 class="info-window-title">\r\n                <small class="text-muted">#{{$ctrl.marker.pokemon.pokedexId}}</small>\r\n                {{$ctrl.marker.pokemon.name}}\r\n            </h5>\r\n            <div>\r\n                <span pokemon-type="{{$ctrl.marker.pokemon.type}}"></span>\r\n            </div>\r\n            <div class="info-window-label">\r\n                {{$ctrl.marker.expirationTime | expiration}} remaining\r\n            </div>\r\n        </div>\r\n\r\n        <!-- PokeStop -->\r\n        <div ng-switch-when="pokestop">\r\n            <div>\r\n                <img ng-src="assets/images/map/pokestop{{$ctrl.marker.lured ? \'pink\' : \'\'}}-2x.png" height="90">\r\n            </div>\r\n            <h5 class="info-window-title">\r\n                Pok\xE9Stop\r\n            </h5>\r\n            <div ng-show="$ctrl.marker.lured">\r\n                <div class="label label-info">\r\n                    Lure Module Active\r\n                </div>\r\n                <div class="info-window-label">\r\n                    Lure expires in: {{$ctrl.marker.lureExpirationTime | expiration}}\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n        <!-- Arena -->\r\n        <div ng-switch-when="arena">\r\n            <div ng-switch="$ctrl.marker.team" style="padding: 10px">\r\n                <div ng-switch-when="Mystic">\r\n                    <img src="assets/images/map/arena_blue-2x.png" height="80">\r\n                </div>\r\n                <div ng-switch-when="Instinct">\r\n                    <img src="assets/images/map/arena_yellow-2x.png" height="80">\r\n                </div>\r\n                <div ng-switch-when="Valor">\r\n                    <img src="assets/images/map/arena_red-2x.png" height="80">\r\n                </div>\r\n                <div ng-switch-default>\r\n                    <img src="assets/images/map/arena_white-2x.png" height="80">\r\n                </div>\r\n            </div>\r\n            <h5 class="info-window-title text-arena-{{$ctrl.marker.team.toLowerCase() || \'default\'}}">\r\n                {{$ctrl.marker.team || "Vacant"}} Gym\r\n            </h5>\r\n            <div ng-show="$ctrl.marker.team">\r\n                <div class="label label-arena-{{$ctrl.marker.team.toLowerCase() || \'default\'}}">\r\n                    Gym Prestige: {{$ctrl.marker.prestige}}\r\n                </div>\r\n            </div>\r\n        </div>\r\n\r\n    </div>\r\n</div>');
$templateCache.put('templates/core/directives/info-panel/InfoPanel.template.html','<div class="panel panel-default info-panel" ng-class="{\'shown\': panelShown}">\r\n    <div class="expand-arrow">\r\n        <a class="btn btn-lg btn-default" ng-click="togglePanel()">\r\n            <span class="fa fa-2x" ng-class="{\'fa-angle-double-left\': !panelShown, \'fa-angle-double-right\': panelShown}"></span>\r\n        </a>\r\n    </div>\r\n    <div class="panel-body">\r\n        <div ng-transclude></div>\r\n    </div>\r\n</div>');
$templateCache.put('templates/core/directives/pokemon-type/PokemonType.template.html','<span ng-repeat="type in types track by $index">\r\n    <span class="label pokemon-type pokemon-type-{{type.toLowerCase()}}">\r\n        {{type}}\r\n    </span>\r\n</span>');}]);