import './TitleScreen.css';

interface TitleScreenProps {
  onStart: () => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <div className="title-screen">
      <div className="title-container">
        <h1 className="title">漫画生存ゲーム</h1>
        <p className="subtitle">週刊少年漫画の連載人生をシミュレート</p>
        
        <button className="start-button" onClick={onStart}>
          ゲーム開始
        </button>

        <div className="info">
          <p>あなたはオリジナル漫画を制作し、週刊少年漫画誌での連載を体験します。</p>
          <p>5分で漫画を作り、数分でその連載人生を見届けましょう。</p>
        </div>
      </div>
    </div>
  );
}
