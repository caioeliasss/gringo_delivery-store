// Teste rápido da configuração do menu
const { ADMIN_MENU_ITEMS } = require("./src/config/menuConfig.js");

// Verificar se o menu de relatórios está configurado corretamente
const reportsMenu = ADMIN_MENU_ITEMS.find((item) => item.text === "Relatórios");

if (reportsMenu) {
  console.log("✅ Menu de Relatórios encontrado!");
  console.log("📋 Propriedades:", {
    text: reportsMenu.text,
    expandable: reportsMenu.expandable,
    hasSubmenu: !!reportsMenu.submenu,
    submenuLength: reportsMenu.submenu?.length || 0,
  });

  if (reportsMenu.submenu) {
    console.log("📄 Submenus:");
    reportsMenu.submenu.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.text} -> ${item.path}`);
    });
  }
} else {
  console.log("❌ Menu de Relatórios não encontrado!");
}
