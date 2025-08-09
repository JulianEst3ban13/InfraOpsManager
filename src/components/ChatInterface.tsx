import React, { useState, useRef, useEffect, useCallback } from "react";
import { Database, Send, RefreshCw, Maximize2, Minimize2, Loader2 } from "lucide-react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import ReactDOM from "react-dom";

interface ChatMessage {
  role: string;
  content: string;
  id: string;
}

interface ChatState {
  history: ChatMessage[];
  currentThread: string | null;
  lastUpdated: number;
}

interface ChatInterfaceProps {
  assistantId: string;
  apiUrl: string;
  storageKey?: string;
}

// Componente ErrorBoundary para capturar errores
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error en ChatInterface:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Algo salió mal con el chat. Por favor recarga la página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded"
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  assistantId,
  apiUrl,
  storageKey = "chatHistory"
}) => {
  // Estado unificado del chat con valores por defecto seguros
  const [chatState, setChatState] = useState<ChatState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validar la estructura del estado guardado
        if (parsed.history && Array.isArray(parsed.history)) {
          return {
            history: parsed.history,
            currentThread: parsed.currentThread || null,
            lastUpdated: parsed.lastUpdated || Date.now()
          };
        }
      }
    } catch (e) {
      console.error("Error al cargar el historial del chat:", e);
    }
    
    // Estado por defecto si hay algún error
    return {
      history: [{
        role: "assistant",
        content: "Hola, soy Niobe, tu asistente experto en bases de datos. ¿En qué puedo ayudarte hoy?",
        id: Date.now().toString()
      }],
      currentThread: null,
      lastUpdated: Date.now()
    };
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Función de persistencia mejorada con manejo de errores
  const persistChatState = useCallback((newState: Partial<ChatState>) => {
    try {
      setChatState(prev => {
        const updatedState = {
          ...prev,
          ...newState,
          lastUpdated: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(updatedState));
        return updatedState;
      });
    } catch (e) {
      console.error("Error al persistir el estado del chat:", e);
      toast.error("Error al guardar el historial del chat");
    }
  }, [storageKey]);

  // Efecto para scroll automático
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatState.history]);

  // Ajustar altura del textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Limpieza automática de chats antiguos
  useEffect(() => {
    const cleanupOldChats = () => {
      try {
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved) as ChatState;
          if (now - (data.lastUpdated || now) > oneWeek) {
            localStorage.removeItem(storageKey);
            resetChat();
          }
        }
      } catch (e) {
        console.error("Error al limpiar chats antiguos:", e);
      }
    };

    cleanupOldChats();
  }, [storageKey]);

  // Reiniciar chat con manejo seguro
  const resetChat = () => {
    try {
      persistChatState({
        history: [{
          role: "assistant",
          content: "Hola, soy Niobe, tu asistente experto en bases de datos. ¿En qué puedo ayudarte hoy?",
          id: Date.now().toString()
        }],
        currentThread: null
      });
      toast.success("Chat reiniciado");
    } catch (e) {
      console.error("Error al reiniciar el chat:", e);
      toast.error("Error al reiniciar el chat");
    }
  };

  // Enviar mensaje con manejo robusto de errores
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      id: Date.now().toString() + '-user'
    };

    try {
      // Animación de envío
      persistChatState({
        history: [...(chatState.history || []), userMessage]
      });
      setMessage("");
      setIsLoading(true);

      const payload = {
        method: "sendMessage",
        service: "openIA",
        params: [{
          message: message,
          assistant_id: assistantId,
          thread: chatState.currentThread,
          stream: false
        }]
      };

      const response = await axios.post(apiUrl, payload);

      let aiResponse = "";
      if (response.data?.result?.message) {
        aiResponse = response.data.result.message;
      } else if (response.data?.response?.result?.message) {
        aiResponse = response.data.response.result.message;
      } else {
        console.error("Estructura no reconocida:", response.data);
        aiResponse = "No pude entender la respuesta del servidor. ¿Podrías reformular tu pregunta?";
      }

      const newThread = response.data?.result?.thread || chatState.currentThread;
      
      // Animación de recepción
      persistChatState({
        history: [...(chatState.history || []), userMessage, {
          role: "assistant",
          content: aiResponse,
          id: Date.now().toString() + '-ai'
        }],
        currentThread: newThread
      });

    } catch (error) {
      console.error("Error en la solicitud:", error);
      persistChatState({
        history: [...(chatState.history || []), userMessage, {
          role: "assistant",
          content: "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor intenta nuevamente.",
          id: Date.now().toString() + '-error'
        }]
      });
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar teclado
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render seguro del historial de chat
  const renderChatHistory = () => {
    try {
      return (chatState.history || []).map((chat) => (
        <ChatMessage
          key={chat.id}
          role={chat.role}
          content={chat.content}
          isNew={chat.id.includes(Date.now().toString().slice(0, -3))}
        />
      ));
    } catch (e) {
      console.error("Error al renderizar el historial del chat:", e);
      return (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error al mostrar el historial del chat
        </div>
      );
    }
  };

  // Contenido del chat (para evitar duplicar)
  const chatContent = (
    <div className={
      isChatExpanded
        ? `fixed inset-0 z-50 m-0 rounded-none flex flex-col bg-neutral-800 border border-neutral-700 transition-all duration-300 ease-in-out`
        : `flex flex-col bg-neutral-800 rounded-lg border border-neutral-700 flex-grow h-[400px] max-h-full transition-all duration-300 ease-in-out`
    }>
      {/* Header del chat */}
      <div className="p-4 border-b border-neutral-700 flex items-center justify-between sticky top-0 bg-neutral-800 z-10">
        <div className="flex items-center">
          <Database className="w-5 h-5 mr-2 text-blue-400" />
          <span className="font-medium">Asistente de Bases de Datos</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsChatExpanded(!isChatExpanded)}
            className="p-2 rounded-full hover:bg-neutral-700 transition-colors"
            title={isChatExpanded ? "Contraer" : "Expandir"}
          >
            {isChatExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={resetChat}
            className="p-2 rounded-full hover:bg-neutral-700 transition-colors"
            title="Reiniciar chat"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${isChatExpanded ? 'pb-24' : 'pb-4'}`}
      >
        {renderChatHistory()}
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        )}
      </div>

      {/* Área de input chat preguntas*/}
      <div className={
        `p-4 border-t border-neutral-700 sticky bottom-0 bg-neutral-800 ${isChatExpanded ? 'px-8' : 'px-2'}`
      }>
        <div className="flex items-center max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyPress}
            placeholder="Pregunta sobre bases de datos..."
            className={
              `flex-1 min-w-0 bg-neutral-700 border border-neutral-600 rounded-l-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 resize-none overflow-hidden ${isChatExpanded ? 'text-base' : 'text-xs'}`
            }
            disabled={isLoading}
            rows={1}
            style={{ minHeight: '36px', maxHeight: '36px', lineHeight: '20px' }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !message.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white h-[36px] px-2 rounded-r-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      {isChatExpanded
        ? ReactDOM.createPortal(chatContent, document.body)
        : chatContent}
    </ErrorBoundary>
  );
};

// Componente ChatMessage mejorado
interface ChatMessageProps {
  role: string;
  content: string;
  isNew?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, isNew = false }) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const handleCopyCode = (code: string, button: HTMLButtonElement) => {
    try {
      // Limpiar el código (eliminar espacios en blanco adicionales al inicio y final)
      const cleanedCode = code.trim();
      
      // Verificar si la API Clipboard está disponible
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        // Usar el nuevo API de clipboard con manejo de errores mejorado
        navigator.clipboard.writeText(cleanedCode)
          .then(() => {
            showCopySuccess(button);
            toast.success("Código copiado al portapapeles");
          })
          .catch(err => {
            console.error("Error al copiar al portapapeles:", err);
            // Intentar con el método alternativo
            fallbackCopyTextToClipboard(cleanedCode, button);
          });
      } else {
        // La API Clipboard no está disponible, usar método alternativo directamente
        console.log("API Clipboard no disponible, usando método alternativo");
        fallbackCopyTextToClipboard(cleanedCode, button);
      }
    } catch (error) {
      console.error("Error inesperado al copiar:", error);
      toast.error("Error al copiar el código");
      // Intentar con el método alternativo como último recurso
      try {
        fallbackCopyTextToClipboard(code.trim(), button);
      } catch (fallbackError) {
        console.error("Error en método alternativo de copia:", fallbackError);
      }
    }
  };
  
  // Función para mostrar el icono de éxito
  const showCopySuccess = (button: HTMLButtonElement) => {
    // Guardar el ícono original
    const originalIcon = button.innerHTML;
    
    // Cambiar al ícono de éxito
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-green-400">
        <path d="M5 13l4 4L19 7"></path>
      </svg>
    `;
    
    // Restaurar el ícono original después de un tiempo
    setTimeout(() => {
      button.innerHTML = originalIcon;
    }, 2000);
  };
  
  // Método alternativo para copiar texto en navegadores más antiguos
  const fallbackCopyTextToClipboard = (text: string, button: HTMLButtonElement) => {
    try {
      // Crear un elemento de texto temporal
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Hacer que el textarea no sea visible
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      
      // Agregar al DOM y seleccionar el texto
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      let successful = false;
      
      try {
        // Intentar copiar - document.execCommand está deprecado pero funciona en navegadores antiguos
        successful = document.execCommand('copy');
      } catch (execError) {
        console.error("Error al ejecutar comando de copia:", execError);
      }
      
      // Limpiar - importante hacerlo en un bloque finally para asegurar que se elimine
      try {
        document.body.removeChild(textArea);
      } catch (cleanupError) {
        console.error("Error al limpiar el textarea temporal:", cleanupError);
      }
      
      if (successful) {
        // Mostrar éxito
        showCopySuccess(button);
        toast.success("Código copiado (método alternativo)");
      } else {
        toast.error("No se pudo copiar el código");
      }
    } catch (err) {
      console.error("Error en el método alternativo de copia:", err);
      toast.error("No se pudo copiar el código");
    }
  };

  // Función para procesar tablas
  const formatTable = (table: string): string => {
    const rows = table.split('\n');
    return `
  <div class="overflow-x-auto my-3">
    <table class="min-w-full border border-gray-600">
      ${rows.map(row => formatTableRow(row)).join('')}
    </table>
  </div>
  `;
  };

  // Función para procesar filas de tabla
  const formatTableRow = (row: string): string => {
    return `
    <tr class="border-b border-gray-600">
      ${row.split('|').slice(1, -1).map(formatTableCell).join('')}
    </tr>
  `;
  };

  // Función para procesar celdas de tabla
  const formatTableCell = (cell: string): string => {
    return `<td class="px-4 py-2 border-r border-gray-600">${cell.trim()}</td>`;
  };

  // Función para procesar bloques de código
  const formatCodeBlock = (language: string, code: string): string => {
    const cleanCode = code.replace(/<\/?[^>]+(>|$)/g, '').trim();
    return `
  <div class="relative bg-gray-800 p-4 rounded-md my-3 font-mono text-sm overflow-x-auto border border-gray-600">
    <div class="flex justify-between items-center mb-2 text-xs text-gray-400">
      <span>${language || 'bash'}</span>
      <button 
        class="p-1 rounded hover:bg-gray-700 transition-colors copy-btn"
        title="Copiar comando"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-gray-300 hover:text-white">
          <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
        </svg>
      </button>
    </div>
    <pre><code class="text-gray-100 whitespace-pre-wrap">${cleanCode}</code></pre>
  </div>
  `;
  };

  // Función principal de formato mejorada
  const formatMessage = (content: string) => {
    // Procesar enlaces
    let formattedContent = content.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline flex items-center">$1 <Link class="w-3 h-3 ml-1"/></a>'
    );

    // Procesar tablas
    formattedContent = formattedContent.replace(
      /(\|.+\|.+\|)(\n\|.+\|.+\|)+/g,
      (table) => formatTable(table)
    );

    // Procesar bloques de código
    formattedContent = formattedContent.replace(
      /```(\w*)\n([^`]+)```/g,
      (_, language, code) => formatCodeBlock(language, code)
    );

    // Procesar títulos
    formattedContent = formattedContent.replace(
      /^##\s(.+)$/gm,
      '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>'
    );

    // Procesar listas
    formattedContent = formattedContent.replace(
      /^\-\s(.+)$/gm,
      '<li class="list-disc ml-5">$1</li>'
    );

    return { __html: formattedContent };
  };

  useEffect(() => {
    if (messageRef.current) {
      // Configurar botones de copiar
      const buttons = messageRef.current.querySelectorAll('.copy-btn');

      // Crear funciones de manejo específicas para cada botón
      const clickHandlers: { element: Element; handler: (event: Event) => void }[] = [];

      buttons.forEach(button => {
        const codeBlock = button.closest('.relative')?.querySelector('code')?.textContent;
        if (codeBlock) {
          // Crear un manejador específico para este botón
          const handler = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            handleCopyCode(codeBlock, button as HTMLButtonElement);
          };
          
          // Almacenar la referencia para limpieza
          clickHandlers.push({ element: button, handler });
          
          // Agregar el event listener
          button.addEventListener('click', handler);
        }
      });

      // Animación para mensajes nuevos
      if (isNew) {
        messageRef.current.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
          messageRef.current?.classList.remove('opacity-0', 'translate-y-2');
        }, 10);
      }

      // Función de limpieza que elimina correctamente los event listeners
      return () => {
        clickHandlers.forEach(({ element, handler }) => {
          element.removeEventListener('click', handler);
        });
      };
    }
  }, [content, isNew]);

  return (
    <div
      ref={messageRef}
      className={`p-4 rounded-lg max-w-[90%] break-words transition-all duration-200 ${role === 'user'
        ? 'ml-auto bg-rose-600 text-white rounded-tr-none'
        : 'bg-gray-700 text-white rounded-tl-none'
        } ${isNew ? 'animate-fadeInUp' : ''} shadow-md`}
      dangerouslySetInnerHTML={formatMessage(content)}
    />
  );
};

export default ChatInterface;