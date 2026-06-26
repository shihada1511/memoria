'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('StudyLogs', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      deckId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Decks', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cardId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Cards', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      correct: { type: Sequelize.BOOLEAN, allowNull: false },
      studiedAt: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('StudyLogs');
  }
};
