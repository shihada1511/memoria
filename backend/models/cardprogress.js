'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CardProgress extends Model {
    static associate(models) {
      CardProgress.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      CardProgress.belongsTo(models.Card, { foreignKey: 'cardId', as: 'card' });
    }
  }
  CardProgress.init({
    userId:         { type: DataTypes.INTEGER, allowNull: false },
    cardId:         { type: DataTypes.INTEGER, allowNull: false },
    correctCount:   { type: DataTypes.INTEGER, defaultValue: 0 },
    incorrectCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    interval:       { type: DataTypes.INTEGER, defaultValue: 1 },
    nextReviewAt:   { type: DataTypes.DATEONLY, allowNull: true },
    lastStudiedAt:  { type: DataTypes.DATEONLY, allowNull: true }
  }, {
    sequelize,
    modelName: 'CardProgress',
    tableName: 'CardProgresses'
  });
  return CardProgress;
};
