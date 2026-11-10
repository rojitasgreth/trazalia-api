# AGENTS.md

## Proyecto

- **Fuentes de verdad:** antes de proponer o implementar cambios, lee el Documento Cero y el spec vigente del módulo. Están en `fisio/docs/docs/`, fuera de este repositorio.
- **Estado de las decisiones:** distingue CONFIRMADO, PROPUESTA y PENDIENTE. Nunca trates una propuesta como decisión aprobada.
- **Ante dudas o riesgos:** si encuentras una contradicción, un riesgo de seguridad o una ambigüedad, detén la parte afectada y pregunta.
- **Idioma:** el dominio va en español (tablas, columnas, clases, métodos y rutas). Los términos del framework se quedan en inglés (`Controller`, `Guard`, `DTO`).
- **Límites entre módulos:** cada módulo es dueño de su esquema. Los módulos no se tocan las tablas entre sí, solo se llaman a través de servicios o casos de uso públicos.
- **Controladores:** son delgados. Las reglas de negocio van en casos de uso, y la autorización siempre se valida en el backend.

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

Nest has first-party packages for many concerns (config, swagger, throttler, schedule, mail, terminus…); check them before adding another library or writing your own.

Validation works with Zod or any other Standard Schema library: `StandardSchemaValidationPipe` with `@Body({ schema })` (https://docs.nestjs.com/application/validation.md).

Nest's packages are ESM only, and this project is ESM too: relative imports end in `.js`, `__dirname` doesn't exist (use `import.meta.dirname`), and tests run on Vitest, so mocks are `vi.fn()`, not `jest.fn()`.
