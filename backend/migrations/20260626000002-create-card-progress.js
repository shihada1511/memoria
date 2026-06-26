'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CardProgresses', {
      id:             { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      userId:         { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      cardId:         { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Cards', key: 'id' }, onDelete: 'CASCADE' },
      correctCount:   { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
      incorrectCount: { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false },
      interval:       { type: Sequelize.INTEGER, defaultValue: 1, allowNull: false },
      nextReviewAt:   { type: Sequelize.DATEONLY, allowNull: true },
      lastStudiedAt:  { type: Sequelize.DATEONLY, allowNull: true },
      createdAt:      { allowNull: false, type: Sequelize.DATE },
      updatedAt:      { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('CardProgresses', ['userId', 'cardId'], { unique: true, name: 'cp_user_card_unique' });
    await queryInterface.addIndex('CardProgresses', ['userId', 'nextReviewAt'], { name: 'cp_user_next_review' });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('CardProgresses');
  }
};
