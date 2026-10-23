# Portal: isolar o encaminhamento FirePotential

O chamador de `handleFirePotential` deve verificar primeiro que o caminho começa por `/firepotential/` ou `/api/firepotential/`. Só depois deve construir o contexto de permissões. A expressão `allowed` deve exigir `session?.type === 'user'` antes de chamar `access`. As sessões transitórias de login não contêm permissões e não devem ser avaliadas como sessões autenticadas.

O formulário de entrada deve declarar `method="post" action="/auth/login"`, mesmo quando a submissão normal é feita por JavaScript com CSRF. Se o script falhar, o navegador nunca deve usar GET para enviar os campos. O servidor mantém a verificação de origem, sessão e CSRF.

Correção aplicada pontualmente ao portal ativo em 24/10/2026, com cópia de segurança. Não substituir o servidor inteiro por um snapshot antigo ao integrar futuras alterações.
