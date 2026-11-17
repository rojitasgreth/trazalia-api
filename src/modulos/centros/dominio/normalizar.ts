/**
 * ADR-0004: clave para detectar centros duplicados sin importar mayúsculas,
 * tildes ni espacios ("Clínica  Santa Sofía" = "clinica santa sofia").
 */
export function normalizarTexto(texto: string): string {
  // NFD separa cada letra de su tilde; \p{M} elimina esas marcas.
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Recorta y colapsa espacios para guardar el texto tal como se mostrará. */
export function limpiarTexto(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}
