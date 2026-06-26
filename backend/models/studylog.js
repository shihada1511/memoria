'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudyLog extends Model {
    static associate(models) {
      StudyLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      StudyLog.belongsTo(models.Deck, { foreignKey: 'deckId', as: 'deck' });
      StudyLog.belongsTo(models.Card, { foreignKey: 'cardId', as: 'card' });
    }
  }
  StudyLog.init({
    userId:    { type: DataTypes.INTEGER,  allowNull: false },
    deckId:    { type: DataTypes.INTEGER,  allowNull: true },
    cardId:    { type: DataTypes.INTEGER,  allowNull: true },
    correct:   { type: DataTypes.BOOLEAN,  allowNull: false },
    studiedAt: { type: DataTypes.DATEONLY, allowNull: false }
  }, {
    sequelize,
    modelName: 'StudyLog',
    tableName: 'StudyLogs'
  });
  return StudyLog;
};
