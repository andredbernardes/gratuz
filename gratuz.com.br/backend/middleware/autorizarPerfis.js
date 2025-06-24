function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    const perfil = req.usuario?.perfil;
    
    console.log('=== DEBUG AUTORIZAÇÃO ===');
    console.log('Perfil do usuário:', perfil);
    console.log('Tipo do perfil:', typeof perfil);
    console.log('Perfis permitidos:', perfisPermitidos);
    console.log('Tipos dos perfis permitidos:', perfisPermitidos.map(p => typeof p));
    console.log('Inclui perfil?', perfisPermitidos.includes(perfil));
    console.log('Comparação direta:', perfisPermitidos.includes(perfil?.toString()));
    console.log('========================');
    
    if (!perfil) {
      console.warn('Tentativa de acesso sem perfil de usuário');
      return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    if (!perfisPermitidos.includes(perfil)) {
      console.warn(`Acesso negado para perfil: ${perfil}. Perfis permitidos: ${perfisPermitidos.join(', ')}`);
      return res.status(403).json({ erro: 'Acesso negado para este perfil' });
    }
    
    console.log('Acesso autorizado para perfil:', perfil);
    next();
  };
}

module.exports = autorizarPerfis;




