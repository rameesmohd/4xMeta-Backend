const compountProfitChartModel = require("../models/compoundProfitChart");
const managerModel = require("../models/manager");
const dayjs = require("dayjs");

exports.getDailyChart = async (req, res) => {
  try {
    const { manager_id, days = 90 } = req.query;

    if (!manager_id)
      return res.status(400).json({ error: "manager_id is required" });

    const start = dayjs().subtract(days, "day").startOf("day").toDate();

    const data = await compountProfitChartModel
      .find({
        manager: manager_id,
        date: { $gte: start },
      })
      .sort({ date: 1 });

    res.json({
      manager_id,
      range: `${days} days`,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getWeeklyChart = async (req, res) => {
  try {
    const { manager_id, weeks = 12 } = req.query;

    if (!manager_id)
      return res.status(400).json({ error: "manager_id is required" });

    const start = dayjs().subtract(weeks * 7, "day").startOf("day").toDate();

    const rows = await compountProfitChartModel
      .find({ manager: manager_id, date: { $gte: start } })
      .sort({ date: 1 });

    const weekly = {};
    for (const row of rows) {
      const week = dayjs(row.date).format("YYYY-[W]WW");

      if (!weekly[week]) weekly[week] = 1;

      weekly[week] *= 1 + row.value / 100;
    }

    const result = Object.keys(weekly).map((key) => ({
      week: key,
      value: Number(((weekly[key] - 1) * 100).toFixed(2)),
    }));

    res.json({ manager_id, weeks, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getMonthlyChart = async (req, res) => {
  try {
    const { manager_id, months = 12 } = req.query;

    if (!manager_id)
      return res.status(400).json({ error: "manager_id is required" });

    const start = dayjs().subtract(months, "month").startOf("month").toDate();

    const rows = await compountProfitChartModel
      .find({ manager: manager_id, date: { $gte: start } })
      .sort({ date: 1 });

    const monthly = {};
    for (const row of rows) {
      const month = dayjs(row.date).format("YYYY-MM");

      if (!monthly[month]) monthly[month] = 1;

      monthly[month] *= 1 + row.value / 100;
    }

    const result = Object.keys(monthly).map((key) => ({
      month: key,
      value: Number(((monthly[key] - 1) * 100).toFixed(2)),
    }));

    res.json({ manager_id, months, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
