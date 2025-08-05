module.exports = function addOrgSequence(model, fieldName) {
  model.beforeCreate(async (instance, options) => {
    const { transaction, orgId } = options;

    if (!orgId) {
      throw new Error("organizationId is required for org sequence.");
    }

    const max = await model.max(fieldName, {
      where: { organizationId: orgId },
      transaction
    });

    instance[fieldName] = (max || 0) + 1;
  });
};
