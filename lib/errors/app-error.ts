/**
 * Códigos de erro estáveis do domínio. Ver docs/08_API_REALTIME_E_CONTRATOS.md.
 * As mensagens padrão são em português e nunca expõem detalhes internos.
 */
export const APP_ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, message: "Dados enviados são inválidos." },
  INVALID_TABLE_TOKEN: { status: 404, message: "QR Code inválido ou desativado." },
  ESTABLISHMENT_UNAVAILABLE: { status: 503, message: "Estabelecimento indisponível." },
  ESTABLISHMENT_SUSPENDED: { status: 403, message: "Serviço temporariamente indisponível." },
  ORDERS_CLOSED: { status: 409, message: "O estabelecimento não está aceitando pedidos agora." },
  PRODUCT_UNAVAILABLE: { status: 409, message: "Um ou mais itens ficaram indisponíveis." },
  PRICE_CHANGED: { status: 409, message: "O preço de um ou mais itens mudou." },
  INVALID_OPTION_SELECTION: { status: 422, message: "Seleção de opções inválida." },
  INVALID_STATUS_TRANSITION: { status: 409, message: "Transição de status não permitida." },
  IDEMPOTENCY_CONFLICT: { status: 409, message: "Requisição conflita com uma anterior." },
  RATE_LIMITED: { status: 429, message: "Muitas tentativas. Aguarde e tente novamente." },
  UNAUTHENTICATED: { status: 401, message: "Sessão ausente ou expirada." },
  FORBIDDEN: { status: 403, message: "Você não tem permissão para esta ação." },
  NOT_FOUND: { status: 404, message: "Recurso não encontrado." },
  INTERNAL_ERROR: { status: 500, message: "Ocorreu um erro inesperado. Tente novamente." },
} as const;

export type AppErrorCode = keyof typeof APP_ERROR_CODES;

/** Compatível com o retorno de `ZodError.flatten().fieldErrors`. */
export type AppErrorFieldErrors = Record<string, string[] | undefined>;

export type AppErrorShape = {
  code: AppErrorCode;
  message: string;
  status: number;
  requestId: string;
  fieldErrors?: AppErrorFieldErrors;
  details?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly requestId: string;
  readonly fieldErrors?: AppErrorFieldErrors;
  readonly details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    options: {
      requestId: string;
      message?: string;
      fieldErrors?: AppErrorFieldErrors;
      details?: Record<string, unknown>;
    },
  ) {
    const definition = APP_ERROR_CODES[code];
    super(options.message ?? definition.message);
    this.name = "AppError";
    this.code = code;
    this.status = definition.status;
    this.requestId = options.requestId;
    this.fieldErrors = options.fieldErrors;
    this.details = options.details;
  }

  toPublicShape(): AppErrorShape {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      requestId: this.requestId,
      ...(this.fieldErrors ? { fieldErrors: this.fieldErrors } : {}),
    };
  }
}
