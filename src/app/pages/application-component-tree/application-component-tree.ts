// import { AsyncPipe } from '@angular/common';
// import { HttpClient } from '@angular/common/http';
// import { Component, OnInit, inject } from '@angular/core';
// import type { EChartsCoreOption } from 'echarts/core';
// import { NgxEchartsDirective } from 'ngx-echarts';
// import { Observable } from 'rxjs';
// import { map } from 'rxjs/operators';
// import * as util from 'zrender/lib/core/util';

// @Component({
//   selector: 'ant-application-component-tree',
//   styleUrl: './application-component-tree.css',
//   templateUrl: './application-component-tree.html',
//   imports: [NgxEchartsDirective, AsyncPipe],
// })
// export class ApplicationComponentTree {
//     private http = inject(HttpClient);
 
//   public options!: Observable<EChartsCoreOption>;

//   ngOnInit(): void {
//     this.options = this.http.get<any>('/data/flare.json', { responseType: 'json' }).pipe(
//       map(data => {
//         util.each(
//           data.children,
//           (datum: any, index: number) => index % 2 === 0 && (datum.collapsed = true)
//         );
//         return {
//           tooltip: {
//             trigger: 'item',
//             triggerOn: 'mousemove',
//           },
//           series: [
//             {
//               type: 'tree',
//               data: [data],
//               top: '1%',
//               left: '7%',
//               bottom: '1%',
//               right: '20%',
//               symbolSize: 7,
//               label: {
//                 position: 'left',
//                 verticalAlign: 'middle',
//                 align: 'right',
//                 fontSize: 9,
//               },
//               leaves: {
//                 label: {
//                   position: 'right',
//                   verticalAlign: 'middle',
//                   align: 'left',
//                 },
//               },
//               expandAndCollapse: true,
//               animationDuration: 550,
//               animationDurationUpdate: 750,
//             },
//           ],
//         };
//       })
//     );
//   }
// }