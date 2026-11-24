import { TranslocoPipe } from '@jsverse/transloco';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AiChatService } from '@app/pages/ai-chat/data/ai-chat';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars, faAnglesLeft, faAnglesRight, faGlobe, faMagnifyingGlass, faMoon, faSun, faRightFromBracket, faWifi3, faClose, faSpiral, faHandSparkles } from '@fortawesome/free-solid-svg-icons';

const CONVERSATION_ID = 'b7d0e3a5';

@Component({
  selector: 'ant-assistant',
  templateUrl:'assistant.component.html',
  imports: [TranslocoPipe, 
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkTextareaAutosize,
    MatIcon,
    MatIconButton,
    MatTooltip,
    RouterLink,

    FontAwesomeModule
  ],
  
})
export class AntAssistant {
  // Dependencies
  private aiChatService = inject(AiChatService);

  // State
  protected opened = signal(false);

  // Data
  protected conversation = this.aiChatService.data.conversations.find(
    (conversation) => conversation.id === CONVERSATION_ID
  )!;
  protected messages = this.conversation.messages.slice(0, 4);

  toggle(force: boolean | null = null) {
    this.opened.update((value) => {
      if (force === null) {
        return !value;
      }

      return force;
    });
  }

    readonly icons = {
      bars: faBars,
      collapse: faAnglesLeft,
      expand: faAnglesRight,
      globe: faGlobe,
      search: faMagnifyingGlass,
      wifi: faWifi3,
      close: faClose,
      sparkles: faHandSparkles
    };
    
}
