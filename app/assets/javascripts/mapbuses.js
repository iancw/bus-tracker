/*
* Draws using the map with id map_canvas in buses/index.html.erb
*/

/*
 * Variables inserted by Rails in map/index.html.erb
 *
    var routes=<%=raw insert_routes %>;
    var routeColors=<%= raw insert_route_colors %>;
    var map;
    var busLocations;
*/
var markers = {};

/*
 * openinfo is used to make sure there's only one open info window at any given time
 * when opening a new window, if this isn't null, it will be closed and then reassinged
*/
var openinfo;
var routeKML = [];
var routePath=null;
var stopMarkers=[];

var activeRoute=null;
var filter_buses=false;


function clearRoutePath()
{
  if(routePath !== null)
  {
    for(var i=0; i<routePath.length; i++)
    {
      clearMap(routePath[i]);
    }
  }
}


function focusRoute(){
      var routeid=activeRoute;
      if(activeRoute === null){
        return;
      }
      $.getScript("routes/busroute"+routeid+".json", drawRoute);
      filter_buses=true;
      hideRouteKML();
      filterBusMarkers();
      showStops();
      $("#show_all").text("Show All");
      $("#show_all").unbind("click", focusRoute);
      $("#show_all").bind("click", showAll);
}

// This is called from the KML layer callback for routes, and also from the 
// info window focus for a bus (the Focus button action, defined in buses/show.html.erb points here)
function primeRoute(routeid)
{
  activeRoute=routeid;
  $("#show_all").text("Show Only Route "+activeRoute);
  $("#show_all").unbind("click", showAll);
  $("#show_all").bind("click", focusRoute);
}


function primeAndFocus(routeid)
{
  primeRoute(routeid);
  focusRoute();
}


function colorForRoute(route_id){
  color_key = route_id.replace(/[a-z].*/, '');
  color=routeColors[color_key]
  if(color == undefined){
    show_debug("Warning, route color for "+color_key+" not defined, generating random color...")
    color=get_random_color();
    routeColors[color_key]=color;
  }
  //KML uses BGR rather than RGB colors, so to get them to match
  // we flip it here (from BGR to RGB)...
  return color.substring(4,6)+color.substring(2,4)+color.substring(0,2);
}

function drawRoute() {
//load the given route and plot it....

  //Sometimes direction0 is null....
  clearRoutePath();
  routePath=[]
  if(RouteDetails.Direction0 != null)
  {
    routePath.push(drawShape(RouteDetails.Direction0.Shape));
  }
  if(RouteDetails.Direction1 != null)
  {
    routePath.push(drawShape(RouteDetails.Direction1.Shape));
  }
}

function filterBusMarkers()
{
  if(buses == null){
    return;
  }
  showFilterRoute();
  for(var i=0; i<buses.length; i++){
    bus=buses[i];
    if(markers[bus.busid] != null){
      if(shouldHide(bus))
      {
        clearMap(markers[bus.busid])
      }
    }
  }

}

function showFilterRoute()
{
  if(activeRoute == null)
  {
    $("#menu_status_area").text("Showing all routes");
  }else{
    $("#menu_status_area").text("Showing route "+activeRoute);
  }
}

function shouldHide(bus){
  return (filter_buses && activeRoute != null) && (bus.wmataid != activeRoute);
}

function hideRouteKML()
{
  for(var i=0; i<routeKML.length; i++){
    clearMap(routeKML[i])
  }
}


function showRouteKML()
{
  for(var i=0; i<routeKML.length; i++){
    setMap(routeKML[i], map);
  }
}

function updateBusMarkers(){

  if(buses == null || buses.length == 0)
  {
    return
  }
  for(var i=0; i<buses.length; i++)
  {
    //buses
    bus=buses[i];
    if(bus != null){
      busTime=parseISO8601(bus.last_update);
      if(isAncient(busTime) || shouldHide(bus)){
        //remove bus
        if(markers[bus.busid] != null){
          clearMap(markers[bus.busid]);
        }
      }else{
        drawBus(bus);
      }
    }
  }

  var myDate = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  show_debug("Showing "+buses.length+" buses at "+myDate);
}

function showStops(){
  if(activeRoute == null)
  {
    return;
  }
  show_debug("Polling stops...");
  pollStops(activeRoute);
}

function hideStops(){
  for(var i=0; i<stopMarkers.length; i++){
    clearMap(stopMarkers[i]);
  }
  stopMarkers=[];
}

function updateStopMarkers(stops){
  show_debug("Got some stops to draw...");
  for (var i=0; i<stops.length; i++)
  {
      //stops
      stop = stops[i];
      var marker = drawStop(stop);
      setStopInfoWindow(marker, stops[i]);
      stopMarkers.push(marker);
  }
  show_debug("Showing "+stops.length+" stops");
}


function updatePrediction(stop_id){
  url="stops/"+stop_id+"/prediction?minimal=true"
  pollPath(url, http_nonsense_wrapper(newStopPrediction));
}


function newStopPrediction(content_text){
  $("#bubble_stop_prediction").html(content_text);
}


function drawBus(bus){
 //Update marker position if it already exists...
 if(markers[bus.busid] != null){
    updateExistingMarker(bus);
  }else{
    //Or create a new marker if it doesnt
    makeNewMarker(bus);
  }
}

function getIconOpacity(bus)
{
  var busTime=parseISO8601(bus.last_update);
  var stale = staleness(busTime);
  return (1.0-stale);
}

function updateIconOpacity(bus)
{
  //Adjust transparency based on staleness
  //All bus markers are made in the makeMarker function
  //and have path, fillColor, fillOpacity, strokeColor, strokeWeight attributes
  //Fill opacity ranges from 0 (totally transparent) to 1 (fully opaque)
  //
  //We'll map the range [.1, .9] on the scale of staleness -- 10 minutes to 0 minutes
  if(bus == null){ return; }
  if(markers[bus.busid] == null){ return; }
  var marker = markers[bus.busid];
  if(marker == null){ return; }

  setIconOpacity(marker, getIconOpacity(bus));
}

function showAll(){
  activeRoute=null;
  filter_buses=false;
  updateBusMarkers();
  hideStops();
  showRouteKML();
  showFilterRoute();
  clearRoutePath();
}

function initialize() {
  // Query location from browser, call showPosition if it works
  navigator.geolocation.getCurrentPosition(showPosition,showError);
  //startPollingBuses();
}

function startPollingBuses(){
  clearInterval(pollStops);
  setInterval(pollBuses, 5000);
}

function startPollingStops(){
  clearInterval(pollBuses);
  setInterval(pollStops, 15000);
}

function showError(error)
{
  showPosition({
    coords :
    {
      latitude: 38.89,
      longitude: -77.03
    }
  });
}
window.onload = initialize;
