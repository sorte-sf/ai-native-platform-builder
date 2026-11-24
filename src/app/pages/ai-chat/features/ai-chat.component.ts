import { TranslocoPipe } from '@jsverse/transloco';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatPrefix } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AiChatService } from '../data/ai-chat';
import { Media } from '@app/core/media';


@Component({
  selector: 'ai-chat',
  templateUrl: 'ai-chat.component.html',
  host: {
    class: 'lg:h-full',
  },
  imports: [TranslocoPipe, 
    CdkTextareaAutosize,
    MatIcon,
    MatIconButton,
    MatFormField,
    MatInput,
    MatPrefix,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatTooltip,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
})
export default class AiChat {
  // Dependencies
  private aiChatService = inject(AiChatService);
  private media = inject(Media);

  // State
  protected data = this.aiChatService.data;
  protected isMobile = computed(() =>
    this.media.match(`(max-width: 1023px)`)()
  );
  protected model = 'Nova 4.5';
  protected models = ['Nova 4.5', 'Nova 4.5 Mini', 'Nova 3 Turbo'];
  protected suggestions = [
    {
      icon: 'code',
      title: 'Review a migration plan',
      description: 'Walk through the risky steps before we ship it.',
    },
    {
      icon: 'file-text',
      title: 'Summarize a long document',
      description: 'Pull out the decisions and the open questions.',
    },
    {
      icon: 'lightbulb',
      title: 'Brainstorm launch angles',
      description: 'Three positioning options for a new plan.',
    },
    {
      icon: 'bug',
      title: 'Debug a failing query',
      description: 'Explain a plan and suggest a better index.',
    },
  ];
  protected groups = computed(() => this.groupConversations());
  protected hasConversation = signal(false);
  panelOpened = signal(false);

  selectConversation() {
    if (this.isMobile()) {
      this.panelOpened.set(false);
    }
  }

  private groupConversations() {
    const conversations = [...this.data.conversations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // The mock data is fixed in time, so the newest conversation defines "today"
    const startOfDay = (date: string) => {
      const value = new Date(date);
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      ).getTime();
    };
    const today = startOfDay(conversations[0].createdAt);
    const daysAgo = (date: string) =>
      Math.round((today - startOfDay(date)) / (24 * 60 * 60 * 1000));

    const groups = [
      { label: 'Today', conversations: [] },
      { label: 'Yesterday', conversations: [] },
      { label: 'Previous 7 days', conversations: [] },
    ] as { label: string; conversations: typeof conversations }[];

    for (const conversation of conversations) {
      const days = daysAgo(conversation.createdAt);
      groups[days === 0 ? 0 : days === 1 ? 1 : 2].conversations.push(
        conversation
      );
    }

    return groups.filter((group) => group.conversations.length > 0);
  }
}
