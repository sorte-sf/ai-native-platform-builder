# @sorte-action-flow

Reusable Angular components for ANTSoftBuilder and other Angular applications.

This library includes the Foblex Flow API as a peer dependency and re-exports it
from `@sorte-action-flow`.

## Build

From the ANTSoftBuilder workspace root:

```sh
npm run build:sorte-action-flow
```

The package is emitted to `dist/sorte-action-flow`. To consume it from a separate application, build it and install the output with `npm install ../path/to/AntsoftBuilder/dist/sorte-action-flow` (adjust the path). Its Angular dependencies are peer dependencies.

## Button

```ts
import { AntButtonComponent } from '@antsoft/sorte-action-flow';

@Component({ imports: [AntButtonComponent], template: `
  <ant-button variant="primary" (click)="save()">Save</ant-button>
` })
export class ExampleComponent {}
```

Variants are `primary`, `secondary`, and `danger`. The component supports native button types and disabled state.

## Foblex Flow

The companion packages are installed in the ANTSoftBuilder workspace and are
declared as peer dependencies of this library. Import the standalone Foblex
directives and components from the library entry point:

```ts
import { FFlowComponent, FCanvasComponent } from '@antsoft/sorte-action-flow';
```

Add Foblex's default theme to the consuming application's global styles when
using its default node and connection styles:

```scss
@use '@foblex/flow/styles/default.scss';
```

The app owns its global theme; the component library does not inject global
styles into consuming applications.

## Marketing automation sample

`MarketingAutomationExampleComponent` is a small reusable example inspired by
the [Foblex Flow marketing automation example](https://flow.foblex.com/examples/marketing-automation).
It renders a subscriber trigger, a welcome email, an open check, and two
branches. Import it into a consuming standalone component:

```ts
import { MarketingAutomationExampleComponent } from '@antsoft/sorte-action-flow';

@Component({
  imports: [MarketingAutomationExampleComponent],
  template: '<sorte-marketing-automation-example />',
})
export class CampaignPageComponent {}
```

The sample uses static campaign steps to keep the first integration clear. Use
it as a base for app-owned campaign data, step editing, persistence, and layout.

## Purchase approval sample

`PurchaseApprovalExampleComponent` demonstrates custom purchase request,
manager review, approved, and rejected nodes with separate outcome connectors.
Import it into a standalone page:

```ts
import { PurchaseApprovalExampleComponent } from '@sorte-action-flow';

@Component({
  imports: [PurchaseApprovalExampleComponent],
  template: '<sorte-purchase-approval-example />',
})
export class PurchaseApprovalPageComponent {}
```

The sample values and approval routing are illustrative; connect the nodes to
your own request data, authorization rules, and persistence.
