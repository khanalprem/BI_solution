require 'rails_helper'

# Regression for Phase 1 R-2: encode → decode round-trip and claim shape.
RSpec.describe BankBi::JwtToken do
  let(:user) { instance_double('User', id: 42, email: 'pat@example.com') }

  describe '.encode + .decode round-trip' do
    it 'produces a token whose payload matches the input user' do
      token   = described_class.encode(user)
      payload = described_class.decode(token)
      expect(payload).to include(
        'user_id' => 42,
        'email'   => 'pat@example.com',
        'iss'     => described_class::ISSUER,
        'aud'     => described_class::AUDIENCE
      )
    end

    it 'sets exp roughly TTL in the future' do
      token   = described_class.encode(user)
      payload = described_class.decode(token)
      delta   = payload['exp'] - Time.current.to_i
      expect(delta).to be_within(60).of(described_class::TTL.to_i)
    end
  end

  describe '.decode' do
    it 'returns nil for tampered tokens' do
      token = described_class.encode(user)
      tampered = token + 'x'
      expect(described_class.decode(tampered)).to be_nil
    end

    it 'returns nil for foreign-issuer tokens' do
      foreign = JWT.encode({ user_id: 1, iss: 'other', aud: described_class::AUDIENCE,
                              iat: Time.now.to_i, exp: 1.hour.from_now.to_i },
                            described_class.secret, described_class::ALGORITHM)
      expect(described_class.decode(foreign)).to be_nil
    end
  end
end
