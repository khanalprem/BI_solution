module SegmentClassifier
  module_function

  def segment_for(total_amount)
    case total_amount
    when 1_000_000_000..Float::INFINITY then 'Private Banking'
    when 200_000_000...1_000_000_000    then 'Affluent'
    when 50_000_000...200_000_000       then 'SME'
    else 'Mass Retail'
    end
  end

  def risk_tier_for(avg_transaction)
    case avg_transaction
    when 5_000_000..Float::INFINITY then 3
    when 1_000_000...5_000_000      then 2
    else 1
    end
  end
end
