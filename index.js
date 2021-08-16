mapboxgl.accessToken =
  "pk.eyJ1IjoiYWxleG1lbC1kb3QiLCJhIjoibVdadkRYayJ9.PwCVjmEcHIX2VA1H1ca4iw";

let map = new mapboxgl.Map({
  container: "map", // container id
  style: "https://api.moscowcitymap.ru/styles?&id=eq.1",//"https://basemap.ru/mcm/api/rpc/get_style?style_number=1",
  center: [37.618, 55.751], // starting position [lng, lat]
  zoom: 10, // starting zoom
  maxZoom: 16,
  minZoom: 9
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.ScaleControl());
map.addControl(
  new mapboxgl.FullscreenControl({ container: document.querySelector("body") })
);
// Add geolocate control to the map.
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true
  })
);

map.on("load", function () {
  var colors = [
    "#009999",
    "#FF7400",
    "#A64B00",
    "#081073",
    "#A60000",
    "#00CC00",
    "#FFBB00",
    "#242E45"
  ];

  var groups = [
    "Велоинфраструктура",
    "Наземный транспорт",
    "Организация движения",
    "Парковки",
    "Пешеходные зоны",
    "Пешеходные переходы",
    "Светофорное регулирование",
    "Прочее"
  ];

  var showVal = {
    Велоинфраструктура: true,
    "Наземный транспорт": true,
    "Организация движения": true,
    Парковки: true,
    "Пешеходные зоны": true,
    "Пешеходные переходы": true,
    "Светофорное регулирование": true,
    Прочее: true
  };

  var showFilter = [
    "any",
    ["all", ["==", ["get", "Class"], groups[0]], showVal[groups[0]]],
    ["all", ["==", ["get", "Class"], groups[1]], showVal[groups[1]]],
    ["all", ["==", ["get", "Class"], groups[2]], showVal[groups[2]]],
    ["all", ["==", ["get", "Class"], groups[3]], showVal[groups[3]]],
    ["all", ["==", ["get", "Class"], groups[4]], showVal[groups[4]]],
    ["all", ["==", ["get", "Class"], groups[5]], showVal[groups[5]]],
    ["all", ["==", ["get", "Class"], groups[6]], showVal[groups[6]]],
    ["all", ["==", ["get", "Class"], groups[7]], showVal[groups[7]]]
  ];

  function drawlayes() {
    // Add a new source from our GeoJSON data and
    // set the 'cluster' option to true. GL-JS will
    // add the point_count property to your source data.

    map.addSource("citizen_ideas", {
      type: "geojson",
      data: "data/ideas.geojson",
      cluster: true,
      filter: showFilter,
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 30 // Radius of each cluster when clustering points (defaults to 50)
    });

    map.addLayer({
      id: "remain",
      type: "circle",
      source:
        ("remainSource",
        {
          type: "geojson",
          data: "data/remain.geojson"
        }),
      paint: {
        "circle-color": "#888888",
        "circle-opacity": 0.8,
        "circle-radius": 4
      }
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "citizen_ideas",
      filter: ["has", "point_count"],
      paint: {
        // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
        // with three steps to implement three types of circles:
        //   * Blue, 20px circles when point count is less than 100
        //   * Yellow, 30px circles when point count is between 100 and 750
        //   * Pink, 40px circles when point count is greater than or equal to 750
        "circle-color": [
          "step",
          ["get", "point_count"],
          "#62A709",
          100,
          "#f1f075",
          750,
          "#f28cb1"
        ],
        "circle-opacity": 0.55,
        "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40]
      }
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "citizen_ideas",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["MoscowSans-Regular"],
        "text-size": 12
      }
    });

    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "citizen_ideas",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "case",
          ["==", ["get", "Class"], groups[0]],
          colors[0],
          ["==", ["get", "Class"], groups[1]],
          colors[1],
          ["==", ["get", "Class"], groups[2]],
          colors[2],
          ["==", ["get", "Class"], groups[3]],
          colors[3],
          ["==", ["get", "Class"], groups[4]],
          colors[4],
          ["==", ["get", "Class"], groups[5]],
          colors[5],
          ["==", ["get", "Class"], groups[6]],
          colors[6],
          colors[7]
        ],
        "circle-radius": 7,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff"
      }
    });
  }

  // Отрисовка слоев
  drawlayes();

  map.on("click", "remain", function (e) {
    var pointFeatures = map.queryRenderedFeatures(e.point, {
      layers: ["remain", "clusters", "unclustered-point"]
    });
    if (pointFeatures.length === 1) {
      var coordinates = e.features[0].geometry.coordinates.slice();
      var ideaText = e.features[0].properties.Тематика;
      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(
          "<p style='font-weight:bold;color:#888'>Рассмотренные предлоежния: </p><span style='color:#888'>" +
            ideaText +
            "</span>"
        )
        .addTo(map);
    }
  });

  map.on("click", "clusters", function (e) {
    var features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"]
    });
    var clusterId = features[0].properties.cluster_id;
    map
      .getSource("citizen_ideas")
      .getClusterExpansionZoom(clusterId, function (err, zoom) {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      });
  });

  // When a click event occurs on a feature in
  // the unclustered-point layer, open a popup at
  // the location of the feature, with
  // description HTML from its properties.
  map.on("click", "unclustered-point", function (e) {
    var coordinates = e.features[0].geometry.coordinates.slice();
    var ideaText = e.features[0].properties.theme;
    var ideaGroup = e.features[0].properties.Class;
    var imageFile = "";
    var ideaStatus = "";

    if (e.features[0].properties.Picture != "null") {
      var imageFile =
        '</br><img src="images/' +
        e.features[0].properties.Picture +
        '" width="200">';
    }

    if (
      (e.features[0].properties.Status == "Реализация") &
      (e.features[0].properties.Year == "2021")
    ) {
      var ideaStatus = '<p class="realization">Запланировано в 2021 году</p>';
    } else if (
      (e.features[0].properties.Status == "Реализация") &
      (e.features[0].properties.Year == "2022+")
    ) {
      var ideaStatus =
        '<p class="realization">Запланировано после 2021 года</p>';
    } else if (e.features[0].properties.Status == "Реализовано") {
      var ideaStatus =
        '<p class="realization">Реализовано в ' +
        e.features[0].properties.Year +
        " году</p>";
    }

    // Ensure that if the map is zoomed out such that
    // multiple copies of the feature are visible, the
    // popup appears over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(
        ideaStatus +
          ideaText +
          "</br><small><b>Категория: </b>" +
          ideaGroup +
          "</small>" +
          imageFile
      )
      .addTo(map);
  });

  map.on("mouseenter", "clusters", function () {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "clusters", function () {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseenter", "remain", function () {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "remain", function () {
    map.getCanvas().style.cursor = "";
  });

  map.on("mousemove", "unclustered-point", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "unclustered-point", function () {
    // Reset the cursor style
    map.getCanvas().style.cursor = "";
  });

  //Кнопки слоев
  // set up the corresponding toggle button for each layer
  for (var i = 0; i < groups.length; i++) {
    var lid = groups[i];
    var link = document.createElement("a");
    link.href = "#";
    link.className = "active";
    link.textID = lid;
    link.textContent = lid;
    // Нажатие кнопки
    link.onclick = function (e) {
      var clickedLayer = this.textID;
      e.preventDefault();
      e.stopPropagation();

      //var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

      // toggle layer visibility by changing the layout object's visibility property
      if (showVal[clickedLayer] === true) {
        //map.setLayoutProperty(clickedLayer, 'visibility', 'none');
        this.className = "";
        showVal[clickedLayer] = false;
      } else {
        this.className = "active";
        showVal[clickedLayer] = true;
        //map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
      }

      if (map.getLayer("clusters")) {
        map.removeLayer("clusters");
        map.removeLayer("cluster-count");
        map.removeLayer("unclustered-point");
      }

      if (map.getSource("citizen_ideas")) {
        map.removeSource("citizen_ideas");
      }

      showFilter = [
        "any",
        ["all", ["==", ["get", "Class"], groups[0]], showVal[groups[0]]],
        ["all", ["==", ["get", "Class"], groups[1]], showVal[groups[1]]],
        ["all", ["==", ["get", "Class"], groups[2]], showVal[groups[2]]],
        ["all", ["==", ["get", "Class"], groups[3]], showVal[groups[3]]],
        ["all", ["==", ["get", "Class"], groups[4]], showVal[groups[4]]],
        ["all", ["==", ["get", "Class"], groups[5]], showVal[groups[5]]],
        ["all", ["==", ["get", "Class"], groups[6]], showVal[groups[6]]],
        ["all", ["==", ["get", "Class"], groups[7]], showVal[groups[7]]]
      ];

      drawlayes();
    };

    //Сворачиваемая менюшка
    var layers = document.getElementById("menu");
    layers.appendChild(link);
  }

  var coll = document.getElementsByClassName("collapsible");
  var i;

  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  }
});
