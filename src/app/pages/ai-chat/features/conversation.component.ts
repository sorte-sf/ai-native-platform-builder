import { TranslocoPipe } from '@jsverse/transloco';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, computed, inject, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { AiChatService } from '../data/ai-chat';
import AiChat from './ai-chat.component';

@Component({
  selector: 'conversation',
  templateUrl: 'conversation.component.html',
  imports: [TranslocoPipe, 
    CdkTextareaAutosize,
    MatDivider,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatTooltip,
  ],
  host: {
    class: 'flex flex-auto flex-col overflow-hidden',
  }
})
export default class Conversation {
  // Dependencies
  private aiChatService = inject(AiChatService);
  protected aiChat = inject(AiChat);

  // Input / Output
  readonly conversationId = input.required({ alias: 'id' });

  // State
  protected data = this.aiChatService.data;
  protected conversation = computed(() =>
    this.data.conversations.find(
      (conversation) => conversation.id === this.conversationId()
    )!
  );
  protected model = 'Ollama 4.5';
  protected models = ['Ollama 4.5', 'Nova 4.5 Mini'];
  protected actions = [
    { icon: 'copy', label: 'Copy' },
    { icon: 'thumbs-up', label: 'Good response' },
    { icon: 'thumbs-down', label: 'Bad response' },
    { icon: 'refresh-cw', label: 'Regenerate' },
  ];
}
