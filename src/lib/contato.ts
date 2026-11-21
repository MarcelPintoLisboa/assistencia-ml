// Contatos do responsável pela assistência — altere aqui se mudarem.
export const CONTATO = {
  instagram: 'marcellisboa',
  celular: '81988055220',
  email: 'mapl11@hotmail.com',
};

export const celularFormatado = () => {
  const n = CONTATO.celular;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
};

export const LINKS = {
  instagram: `https://instagram.com/${CONTATO.instagram}`,
  whatsapp: `https://wa.me/55${CONTATO.celular}`,
  telefone: `tel:+55${CONTATO.celular}`,
  email: `mailto:${CONTATO.email}`,
};
