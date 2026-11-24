import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import L from 'leaflet';

@Component({
  selector: 'ant-sorte-maps',
  styleUrl: './sorte-maps.css',
  templateUrl: './sorte-maps.html',
  imports: [
    CommonModule,

  ],
})
export class SorteMaps {

  map!: L.Map;
 
  currentRoute!: L.Polyline;
  currentPoints: L.Layer[] = [];
  
/*

  onMapReady(_map: L.Map): void {
    this.map = _map;

    // this.mapService.addPlaceRoutes(this.data.otherRoutes, .4);
    // // this.mapService.addPlaceMarkers(this.markers, true);
    // if (!this.edit) {
    //   return;
    // }

    // this.currentRoute = this.mapService.addPlaceRoute(this.data.route.encodedPolyline, this.data.route.color, this.data.route.opacity, true, this.data.route.name);

  }

  handleMultiLayerDrawn(event: MapMultiLayerDrawEvent): void {
    this.currentPoints = event.layers;
    this.generateRoute();
  }

  generateRoute(): void {
    this.clearRoute();

  }

  private setRoutePolyline(): void {
    if (!this.currentRoute) {
      return;
    }

    // const formData = this.routeForm.getRawValue();
    // this.currentRoute.bindPopup(formData.name);
    // this.currentRoute.setStyle({
    //   color: formData.color,
    //   opacity: formData.opacity,
    // });

  }

  private clearRoute(): void {
    
  }

*/
}
