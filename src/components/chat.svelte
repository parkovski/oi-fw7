<script>
  import { Block, TextEditor } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import webSocketService from '../services/websocket';

  let chat;
  let textEditor;

  onMount(() => {
    chat.scrollTop = chat.scrollHeight;

    textEditor.instance().contentEl.addEventListener('keydown', function(e) {
      if (e.composing || e.keyCode === 229) {
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const instance = textEditor.instance();
        if (instance.value === '') {
          return;
        }
        webSocketService.sendJson({
          message: 'chat',
          to: '1',
          text: instance.value,
        });
        instance.value = '';
        instance.contentEl.innerHTML = '';
      }
    });

    webSocketService.subscribe('chat', message => {
      let el = document.createElement('p');
      el.classList.add('chat-left');
      el.innerText = message.text;
      chat.appendChild(el);
    });
  });
</script>

<style>
  p {
    clear: both;
    max-width: 50%;
    display: inline-block;
    padding: 8px;
    border-radius: 8px;
    margin: 2em 0 0 0;
  }

  p:first-child {
    margin-top: 1em;
  }

  .chat-left {
    float: left;
    background: lightgrey;
  }

  :global(.dark) .chat-left {
    background: #444;
  }

  .chat-right {
    float: right;
    text-align: right;
    background: var(--f7-theme-color);
    color: var(--f7-button-fill-text-color, #fff);
  }

  .chat-left + .chat-left, .chat-right + .chat-right {
    margin-top: .25em;
  }

  .container {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .chat {
    flex: 1 1 auto;
    overflow-y: scroll;
    padding: 0 var(--f7-block-padding-horizontal);
  }

  .editor {
    flex: 0 1 auto;
  }
</style>

<div class="container">
  <div bind:this={chat} class="chat">
    <p class="chat-left">Hello there</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-right">Hello yourself</p>
    <p class="chat-right">This is the chat that never ends it goes on and on
      and on and on and on and on and on</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <p class="chat-left">This is the chat that never ends it goes on and on and
      on and on and on and on and on</p>
    <div style="clear:both"></div>
  </div>
  <div class="editor">
    <TextEditor
      bind:this={textEditor}
      placeholder="Say something..."
      mode="popover"
      buttons={['bold', 'italic', 'underline']}
      resizable
    />
  </div>
</div>
