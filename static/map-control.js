Polymer({
    is: 'map-control',
    _newmarkers: [],
    _ajax: null,
    properties: {
        config: {
            type: Object,
            value: {}
        },
        map: {
            type: Object,
            value: null
        },
        markers: {
            type: Array,
            value: []
        },
        cercanos: {
            type: Array,
            value: []
        },
        descrip: Object,
        selectedMarker: {
            type: Object,
            value: null
        },
    },
    created: function () {
        this.async(function () {
            this._init();
        });
    },
    openSubMenu: function () {
        this.$.submenu.openDrawer();
    },
    closeSubMenu: function () {
        this.$.submenu.closeDrawer();
        this._submenuclose();
    },
    toggleSubMenu: function () {
        this.$.submenu.togglePanel();
    },
    zoomTo: function (marker) {
        this.map.panTo(marker.position);
        this._setZoom(18);
    },
    _init: function () {
        window.mapControl = this;
        this.addEventListener('google-map-ready', function (e) {
            this.map = this.$.gMap.map;
            window.gm = google.maps;
            this._ajax = this.$.jsLuminaria;
            this._ajax.generateRequest();
            gm.event.addListenerOnce(this.map, 'idle', function (e) {
                this.$.gMap.style.opacity = 1;
                if(this.config.vars){
                  this._toasAlert('ok');
                  this.filterVal = this.config.vars.alias;
                }
            }.bind(this));
        }.bind(this));

        this.$.submenu.addEventListener('iron-deselect',function(e){
            if(e.detail.item.id == "drawer"){
                this._centerInMarkers();
            }
        }.bind(this));
    },

    _addMarker: function (nlat, nlng, title, icon, index, id) {
        var marker = new gm.Marker({
            map: this.map,
            title: title,
            position: {
                lat: nlat ? parseFloat(nlat) : 0,
                lng: nlng ? parseFloat(nlng) : 0
            },
            icon: (icon ? icon : undefined)
        });
        index = this._newmarkers.length
        this.push('_newmarkers', {'marker': marker, 'mp_index': index, 'id': id, 'position': {lat: parseFloat(nlat), lng: parseFloat(nlng)}});
        gm.event.addListener(marker, 'click', function (e) {
            this.$.jsimagen.params.reporte__id = id;
            this.$.jsimagen.generateRequest()
        }.bind(this));
        this.fire('mc-addmarker', {
            'marker': marker
        });
    },

    _addBasurero: function (nlat, nlng, title, icon, index, descripcion, tamano,id) {
        var marker = new gm.Marker({
            map: this.map,
            title: title,
            position: {
                lat: nlat ? parseFloat(nlat) : 0,
                lng: nlng ? parseFloat(nlng) : 0
            },
            icon: (icon ? icon : undefined)
        });
        this.push('cercanos', {'marker': marker, 'mp_index': index, 'id': id, 'position': {lat: parseFloat(nlat), lng: parseFloat(nlng)}});
        this.fire('mc-addmarker', {
            'marker': marker
        });


        var contentString = 
              '<h4 id="firstHeading" class="firstHeading">'+title+'</h1>'+
              '<p>' + descripcion + '<p><br>'+
              '<paper-button raised on-tap="_indexar" onclick="mapControl._indexar('+id+', \''+title+'\', \''+descripcion+'\', \''+tamano+'\')">Indexar reporte</paper-button>';


        var infowindow = new google.maps.InfoWindow({
            content: contentString
        });

        gm.event.addListener(marker, 'click', function (e) {
            infowindow.open(this.map, marker);
        }.bind(this));
    },

    _submenuclose: function(e){
        this.$.reporte_id.value = ""
        this.$.crearb.close();
        for (var i = 0; i < this.markers.length; i++) {
            this.markers[i].marker.setMap(this.map);
        }
        for (var i = 0; i < this.cercanos.length; i++) {
            this.cercanos[i].marker.setMap(null);
        }
        this.cercanos = []
        this.selectedMarker.marker.setIcon(null);
        this.selectedMarker = null;
    },

    _jsImagen: function(e){
      this.openSubMenu();
      this.descrip = e.detail.response;
    },

    _descartar: function(){
        console.log(this.selectedMarker.id)
        console.log(this.selectedMarker)
        this.$.jsdescartar.params.id = this.selectedMarker.id;
        this.$.jsdescartar.generateRequest();
    },

    _indexar: function(id, titulo, descripcion, tamano){
        console.log(id, titulo, descripcion, tamano);
        this.$.btitle.value = titulo;
        this.$.bdesc.value = descripcion
        this.$.btam.value = tamano
        this.$.reporte_id_index.value = this.selectedMarker.id
        this.$.basurero_id.value = id;
        this.$.indexar.open()
    },

    indexado: function(){
       this._toasAlert('reporte indexado'); 
       elem = document.querySelector('paper-item input[value="'+ this.selectedMarker.mp_index +'"]').parentNode
       elem.parentNode.removeChild(elem)
       this.markers[this.selectedMarker.mp_index].marker.setMap(null);
       inputs = document.querySelectorAll('paper-item input[type="hidden"]')
       for (var i = inputs.length - 1; i >= 0; i--) {
           var input = inputs[i]
           if (input.getAttribute("value") > this.selectedMarker.mp_index) {
                console.log(input.getAttribute("value"))
                input.setAttribute("value", (input.getAttribute("value") - 1));
           };
       };
       this.markers.splice(this.selectedMarker.mp_index, 1);
       this.closeSubMenu();
       this._centerInMarkers(); 
    },

    _sendIndex: function(){
        this.$.indexarb.submit();
    },

    _descartado: function(){
       this._toasAlert('reporte descartado'); 
       elem = document.querySelector('paper-item input[value="'+ this.selectedMarker.mp_index +'"]').parentNode
       elem.parentNode.removeChild(elem)
       this.markers[this.selectedMarker.mp_index].marker.setMap(null);
       inputs = document.querySelectorAll('paper-item input[type="hidden"]')
       for (var i = inputs.length - 1; i >= 0; i--) {
           var input = inputs[i]
           if (input.getAttribute("value") > this.selectedMarker.mp_index) {
                console.log(input.getAttribute("value"))
                input.setAttribute("value", (input.getAttribute("value") - 1));
           };
       };
       this.markers.splice(this.selectedMarker.mp_index, 1);
       this.closeSubMenu();
       this._centerInMarkers();
    },

    _goMarker: function (e, item) {
        var markerIndex = item.item.querySelector('input[type="hidden"]').getAttribute('value');
        if (!markerIndex) return;
        var aux = this.markers[markerIndex];
        this.$.jscercanos.params.latitude = aux.position.lat;
        this.$.jscercanos.params.longitude = aux.position.lng;
        this.$.jscercanos.generateRequest();
        this.$.jsimagen.params.reporte__id = aux.id;
        this.$.jsimagen.generateRequest();
        this.zoomTo(aux.marker);
        this.selectedMarker = aux;
        this.fire('mc-selectedmarker', {
            'marker': aux.marker
        });
    },

    _goHome: function () {
        console.log('ok');
        window.location = '/dashboard/';
    },

    _setZoom: function (zoom) {
        this.map.setZoom(zoom);
    },

    _deleteMarkers: function () {
        for (var i = 0; i < this.markers.length; i++) {
            this.markers[i].marker.setMap(null);
        }
        this.markers = [];
    },

    _hideMarkers: function () {
        for (var i = 0; i < this.markers.length; i++) {
            this.markers[i].marker.setMap(null);
        }
        this.selectedMarker.marker.setMap(this.map)
    },

    _jsLuminarias: function (e) {
        var response = e.detail.response;
        if (response) {
            var list = response.results;
            var next = response.next;
            for (var i = 0; i < list.length; i++) {
                this._cretateMarker(i, list[i]);
            }
            if (response.next) {
                this.$.jsLuminaria.url = next;
                this.$.jsLuminaria.generateRequest();
            } else {
                this.markers = this._newmarkers;
                this._newmarkers = [];
                this._centerInMarkers();
            }
        }
    },

    _cercanos: function(e){
        var response = e.detail.response;
        this.selectedMarker.marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4
        });
        this._hideMarkers();
        for (var i = response.length - 1; i >= 0; i--) {
            basurero = response[i];
            console.log(basurero)
            this._addBasurero(
                basurero.latitude,
                basurero.longitude,
                basurero.nombre,
                undefined,
                i,
                basurero.descripcion,
                basurero.tamano,
                basurero.pk
            );
        };
    },

    _cretateMarker: function (index, item) {
        this._addMarker(
            item.gps.latitude,
            item.gps.longitude,
            "reporte " + index,
            item.icon,
            index,
            item.id
        );
    },
    _centerInMarkers: function () {
        var bounds = new gm.LatLngBounds();
        for (var i = 0; i < this.markers.length; i++) {
            if (this.markers[i] != null) {
                var mk = this.markers[i].marker;
                bounds.extend(mk.position);
            };
        }
        this.map.fitBounds(bounds);
    },
    
    _crearb: function(){
        this.$.reporte_id.value = this.selectedMarker.id
        this.$.crearb.open();
    },

    _sendForm: function(){
        this.$.fcrearb.submit();
    },
    _rcrearb: function(event){
       this._toasAlert('reporte indexado'); 
       elem = document.querySelector('paper-item input[value="'+ this.selectedMarker.mp_index +'"]').parentNode
       elem.parentNode.removeChild(elem)
       this.markers[this.selectedMarker.mp_index].marker.setMap(null);
       inputs = document.querySelectorAll('paper-item input[type="hidden"]')
       for (var i = inputs.length - 1; i >= 0; i--) {
           var input = inputs[i]
           if (input.getAttribute("value") > this.selectedMarker.mp_index) {
                console.log(input.getAttribute("value"))
                input.setAttribute("value", (input.getAttribute("value") - 1));
           };
       };
       this.markers.splice(this.selectedMarker.mp_index, 1);
       this.closeSubMenu();
       this._centerInMarkers();
    },
    _toasAlert: function(val) {
        this.$.talertm.innerHTML = val;
        this.$.talert.open();
    },
     _error: function(e){
       var error = e.detail.error
       this._toasAlert(error);
       console.log(error, e);
     },
    _openDg: function(e) {
        var id = e.target.parentNode.querySelector('.data-dg').value;
        document.getElementById('dg' + id).open();
    }
});
