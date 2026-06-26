import {defaultApiConfig} from '@/services/apiClient';
export default function ApiConnectionPanel(){return <div className="card"><h3>API接続設定</h3><p className="muted">現在モード：{defaultApiConfig.mode}</p><div className="reason"><strong>次の接続先</strong><br/><span className="mini">公式サイト取得 / 有料API / 独自DB の3系統に対応する前提の土台です。</span></div></div>}
