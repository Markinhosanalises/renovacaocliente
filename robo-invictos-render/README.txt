ROBÔ INVICTOS - RENDER

1) Suba esta pasta/ZIP em um repositório GitHub.
2) No Render: New > Web Service > conecte o repositório.
3) Configure:
   Build Command: npm install
   Start Command: npm start

4) Environment Variables no Render:
   INVICTOS_LOGIN=seu_usuario_do_painel
   INVICTOS_PASSWORD=sua_senha_do_painel
   ROBOT_SECRET=crie_uma_senha_grande_qualquer
   INVICTOS_URL=https://invictosserver.site/#/sign-in

5) Depois que subir, teste abrindo:
   https://SEU-SERVICO.onrender.com/

6) Endpoint que a área do cliente vai chamar:
   POST https://SEU-SERVICO.onrender.com/renovar
   Header: x-robot-secret: mesmo valor do ROBOT_SECRET
   Body JSON:
   { "usuario": "65688514", "connections": 2, "planoTexto": "MENSAL COMPLETO C/ADULTOS" }
