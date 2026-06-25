'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Admins', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });

    await queryInterface.addColumn('Admins', 'theme', {
      type: Sequelize.ENUM('light', 'dark', 'system'),
      allowNull: false,
      defaultValue: 'light'
    });

    // Backfill existing admins with a username derived from their email, so the
    // column can be made required without breaking pre-existing rows.
    const [admins] = await queryInterface.sequelize.query('SELECT id, email FROM Admins');
    for (const admin of admins) {
      const username = admin.email.split('@')[0];
      await queryInterface.sequelize.query(
        'UPDATE Admins SET username = ? WHERE id = ?',
        { replacements: [username, admin.id] }
      );
    }

    await queryInterface.changeColumn('Admins', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Admins', 'theme');
    await queryInterface.removeColumn('Admins', 'username');
  }
};
